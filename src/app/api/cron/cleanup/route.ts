import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/**
 * GET /api/cron/cleanup
 * Clean up expired table holds.
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const supabase = createServerClient();
    const now = new Date().toISOString();

    // Delete all expired holds
    const { error: deleteError, count } = await supabase
      .from("reservations")
      .delete({ count: "exact" })
      .eq("status", "HELD")
      .lt("held_until", now);

    if (deleteError) {
      console.error("[Cleanup] Delete error:", deleteError);
      return NextResponse.json(
        { success: false, message: `Failed to clean up holds: ${deleteError.message}` },
        { status: 500 }
      );
    }

    const cleaned = count || 0;
    console.log(`[Cleanup] Removed ${cleaned} expired hold(s)`);

    return NextResponse.json({
      success: true,
      cleaned,
    });
  } catch (err) {
    console.error("[Cleanup] Error:", err);
    return NextResponse.json(
      { success: false, message: `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
