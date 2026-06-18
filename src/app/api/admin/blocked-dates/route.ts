import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { checkStaffAuth, unauthorized } from "@/lib/auth";

// GET: List all blocked dates ordered by date
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request);
  if (!auth.authenticated) {
    return unauthorized();
  }

  try {
    const supabase = createServerClient();

    const { data: blockedDates, error } = await supabase
      .from("blocked_dates")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to fetch blocked dates." }, { status: 500 });
    }

    return NextResponse.json({ success: true, blockedDates: blockedDates || [] });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

// POST: Block a date (upsert to handle duplicates)
export async function POST(request: NextRequest) {
  const auth = await checkStaffAuth(request);
  if (!auth.authenticated) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const { date, reason } = body;

    if (!date) {
      return NextResponse.json({ success: false, message: "date is required." }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: blockedDate, error } = await supabase
      .from("blocked_dates")
      .upsert(
        { date, reason: reason || "" },
        { onConflict: "date" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to block date." }, { status: 500 });
    }

    return NextResponse.json({ success: true, blockedDate });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }
}

// DELETE: Unblock a date
export async function DELETE(request: NextRequest) {
  const auth = await checkStaffAuth(request);
  if (!auth.authenticated) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "id is required." }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("blocked_dates")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to unblock date." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Date unblocked." });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }
}
