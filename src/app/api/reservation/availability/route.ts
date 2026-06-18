import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { TABLES, timesOverlapWithBuffer, RESTAURANT_CONFIG } from "@/data/restaurant";

// GET: Check table availability for a given date and time range
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");

  if (!date || !startTime || !endTime) {
    return NextResponse.json(
      { success: false, message: "date, startTime, and endTime are required." },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();

    // Check if date is blocked
    const { data: blockedDate } = await supabase
      .from("blocked_dates")
      .select("*")
      .eq("date", date)
      .maybeSingle();

    if (blockedDate) {
      return NextResponse.json({
        success: true,
        blocked: true,
        blockReason: blockedDate.reason,
        tables: [],
        isFullCafeBlocked: true,
      });
    }

    // Fetch existing reservations for this date (active statuses only)
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("id, status, booking_type, table_number, start_time, end_time, is_full_cafe, customer_name, held_until")
      .eq("date", date)
      .in("status", ["HELD", "PENDING", "CONFIRMED", "ARRIVED"]);

    if (error) {
      // If new columns don't exist yet, fall back to basic query
      if (error.code === "42703") {
        console.log("New columns not found, using basic query for availability");
        return NextResponse.json({
          success: true,
          blocked: false,
          tables: TABLES.map((t) => ({
            number: t.number,
            capacity: t.capacity,
            label: t.label,
            available: true,
          })),
          isFullCafeBlocked: false,
        });
      }
      console.error("Availability query error:", error);
      return NextResponse.json({ success: false, message: "Database error." }, { status: 500 });
    }

    const activeReservations = (reservations || []).filter((r) => {
      // Filter out expired holds
      if (r.status === "HELD" && r.held_until) {
        return new Date(r.held_until) > new Date();
      }
      return true;
    });

    // Check if full cafe is booked during requested time
    const fullCafeBlock = activeReservations.find((r) => {
      if (!r.is_full_cafe || r.status === "HELD") return false;
      if (r.status !== "CONFIRMED" && r.status !== "ARRIVED") return false;
      if (!r.start_time || !r.end_time) return false;
      return timesOverlapWithBuffer(startTime, endTime, r.start_time, r.end_time, RESTAURANT_CONFIG.bufferMinutes);
    });

    if (fullCafeBlock) {
      return NextResponse.json({
        success: true,
        blocked: false,
        tables: TABLES.map((t) => ({
          number: t.number,
          capacity: t.capacity,
          label: t.label,
          available: false,
          reason: "Full cafe reserved",
        })),
        isFullCafeBlocked: true,
      });
    }

    // Check each table's availability
    const tables = TABLES.map((table) => {
      // Find conflicts for this table (using buffer-aware overlap)
      const conflict = activeReservations.find((r) => {
        if (r.table_number !== table.number) return false;
        if (!r.start_time || !r.end_time) return false;
        return timesOverlapWithBuffer(startTime, endTime, r.start_time, r.end_time, RESTAURANT_CONFIG.bufferMinutes);
      });

      if (conflict) {
        const isHeld = conflict.status === "HELD";
        const isPending = conflict.status === "PENDING";
        return {
          number: table.number,
          capacity: table.capacity,
          label: table.label,
          available: false,
          pending: isPending,
          held: isHeld,
          reason: isHeld
            ? "Table is being held"
            : isPending
              ? `Pending — ${conflict.customer_name || "Guest"}`
              : `Reserved — ${conflict.customer_name || "Guest"}`,
        };
      }

      return {
        number: table.number,
        capacity: table.capacity,
        label: table.label,
        available: true,
      };
    });

    // Check if full cafe can be booked (all tables must be free)
    const anyTableConflict = activeReservations.some((r) => {
      if (!r.start_time || !r.end_time) return false;
      if (r.status === "HELD") return false; // Holds don't block full cafe
      return timesOverlapWithBuffer(startTime, endTime, r.start_time, r.end_time, RESTAURANT_CONFIG.bufferMinutes);
    });

    return NextResponse.json({
      success: true,
      blocked: false,
      tables,
      isFullCafeBlocked: anyTableConflict,
    });
  } catch (err) {
    console.error("Availability error:", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}
