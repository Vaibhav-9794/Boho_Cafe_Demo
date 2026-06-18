import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/**
 * POST /api/reservation/waitlist
 * Join the waitlist for a specific date/time slot.
 */
export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, date, startTime, endTime } = await request.json();

    // Validation
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: name, email, phone, date, startTime, endTime." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check for duplicate waitlist entry
    const { data: existing } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .eq("date", date)
      .eq("start_time", startTime)
      .eq("end_time", endTime)
      .eq("notified", false)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, message: "You are already on the waitlist for this time slot." },
        { status: 409 }
      );
    }

    // Insert waitlist entry
    const { data: entry, error: insertError } = await supabase
      .from("waitlist")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        date,
        start_time: startTime,
        end_time: endTime,
        notified: false,
      })
      .select("id")
      .single();

    if (insertError || !entry) {
      console.error("[Waitlist] Insert error:", insertError);
      return NextResponse.json(
        { success: false, message: `Failed to join waitlist: ${insertError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    console.log(`[Waitlist] ${name.trim()} (${email.trim()}) joined waitlist for ${date} ${startTime}-${endTime}`);

    return NextResponse.json({ success: true, id: entry.id });
  } catch (err) {
    console.error("[Waitlist] Error:", err);
    return NextResponse.json(
      { success: false, message: `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
