import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { timesOverlapWithBuffer, RESTAURANT_CONFIG } from "@/data/restaurant";

/**
 * POST /api/reservation/hold
 * Create a temporary table hold (10 minutes).
 */
export async function POST(request: NextRequest) {
  try {
    const { date, startTime, endTime, tableNumber, sessionId } = await request.json();

    // Validation
    if (!date || !startTime || !endTime || !tableNumber || !sessionId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: date, startTime, endTime, tableNumber, sessionId." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // ── Check for existing holds / reservations that conflict ──
    const activeStatuses = ["HELD", "PENDING", "CONFIRMED", "ARRIVED"];
    const { data: existing } = await supabase
      .from("reservations")
      .select("id, table_number, start_time, end_time, status")
      .eq("date", date)
      .eq("table_number", tableNumber)
      .in("status", activeStatuses);

    if (existing && existing.length > 0) {
      const conflict = existing.find(
        (r) =>
          r.start_time &&
          r.end_time &&
          timesOverlapWithBuffer(startTime, endTime, r.start_time, r.end_time, RESTAURANT_CONFIG.bufferMinutes)
      );

      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            message: `Table ${tableNumber} is already ${conflict.status === "HELD" ? "held" : "reserved"} during this time slot.`,
          },
          { status: 409 }
        );
      }
    }

    // ── Insert HELD reservation ──
    const heldUntil = new Date(Date.now() + RESTAURANT_CONFIG.holdMinutes * 60 * 1000).toISOString();

    const { data: hold, error: insertError } = await supabase
      .from("reservations")
      .insert({
        customer_name: "HOLD",
        phone: "",
        email: "",
        date,
        time: startTime,
        start_time: startTime,
        end_time: endTime,
        table_number: tableNumber,
        guest_count: 0,
        occasion: "",
        special_requests: "",
        status: "HELD",
        held_until: heldUntil,
        session_id: sessionId,
        booking_type: "TABLE",
      })
      .select("id")
      .single();

    if (insertError || !hold) {
      console.error("[Hold] Insert error:", insertError);
      return NextResponse.json(
        { success: false, message: `Failed to create hold: ${insertError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    console.log(`[Hold] Created hold ${hold.id} for table ${tableNumber} on ${date} ${startTime}-${endTime}, expires ${heldUntil}`);

    return NextResponse.json({ success: true, holdId: hold.id });
  } catch (err) {
    console.error("[Hold] Error:", err);
    return NextResponse.json(
      { success: false, message: `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reservation/hold
 * Release an existing table hold.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { holdId } = await request.json();

    if (!holdId) {
      return NextResponse.json(
        { success: false, message: "Missing required field: holdId." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Only delete if it's still in HELD status
    const { error: deleteError, count } = await supabase
      .from("reservations")
      .delete({ count: "exact" })
      .eq("id", holdId)
      .eq("status", "HELD");

    if (deleteError) {
      console.error("[Hold] Delete error:", deleteError);
      return NextResponse.json(
        { success: false, message: `Failed to release hold: ${deleteError.message}` },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { success: false, message: "Hold not found or already released." },
        { status: 404 }
      );
    }

    console.log(`[Hold] Released hold ${holdId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Hold] Error:", err);
    return NextResponse.json(
      { success: false, message: `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
