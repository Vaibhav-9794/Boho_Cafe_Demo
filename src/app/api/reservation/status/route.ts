import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET: Check reservation status by id + email
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const email = searchParams.get("email");

  if (!id || !email) {
    return NextResponse.json(
      { success: false, message: "Reservation ID and email are required." },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("reservations")
      .select("id, customer_name, date, time, start_time, end_time, guest_count, status, booking_type, table_number, is_full_cafe, occasion, created_at")
      .eq("id", id)
      .eq("email", email.toLowerCase())
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: "Reservation not found. Check your ID and email." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reservation: {
        id: data.id,
        customerName: data.customer_name,
        date: data.date,
        time: data.start_time || data.time,
        startTime: data.start_time,
        endTime: data.end_time,
        guestCount: data.guest_count,
        status: data.status,
        bookingType: data.booking_type,
        tableNumber: data.table_number,
        isFullCafe: data.is_full_cafe,
        occasion: data.occasion,
        createdAt: data.created_at,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 }
    );
  }
}
