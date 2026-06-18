import { NextRequest, NextResponse } from "next/server";
import { createServerClient, Reservation } from "@/lib/supabase";
import { RESTAURANT_CONFIG } from "@/data/restaurant";
import { checkStaffAuth, unauthorized } from "@/lib/auth";

// GET: Analytics for a date range
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request, ["OWNER"]);
  if (!auth.authenticated) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { success: false, message: "from and to query params are required (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch reservations in date range
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("*")
      .gte("date", from)
      .lte("date", to);

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to fetch reservations." }, { status: 500 });
    }

    const allReservations = (reservations || []) as Reservation[];

    // ── Status counts ──
    const counts = {
      total: allReservations.length,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      no_show: 0,
      arrived: 0,
      completed: 0,
      rejected: 0,
      held: 0,
    };

    for (const r of allReservations) {
      switch (r.status) {
        case "PENDING": counts.pending++; break;
        case "CONFIRMED": counts.confirmed++; break;
        case "CANCELLED": counts.cancelled++; break;
        case "NO_SHOW": counts.no_show++; break;
        case "ARRIVED": counts.arrived++; break;
        case "COMPLETED": counts.completed++; break;
        case "REJECTED": counts.rejected++; break;
        case "HELD": counts.held++; break;
      }
    }

    // ── Reservations per day ──
    const dayMap = new Map<string, number>();
    // Initialize all days in range
    const startDate = new Date(from);
    const endDate = new Date(to);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dayMap.set(dateStr, 0);
    }
    for (const r of allReservations) {
      dayMap.set(r.date, (dayMap.get(r.date) || 0) + 1);
    }
    const reservationsPerDay = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // ── Peak hours (group by start_time) ──
    const hourMap = new Map<string, number>();
    for (const r of allReservations) {
      const time = r.start_time || r.time;
      if (time) {
        hourMap.set(time, (hourMap.get(time) || 0) + 1);
      }
    }
    const peakHours = Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);

    // ── Popular tables (group by table_number where not null) ──
    const tableMap = new Map<number, number>();
    for (const r of allReservations) {
      if (r.table_number != null) {
        tableMap.set(r.table_number, (tableMap.get(r.table_number) || 0) + 1);
      }
    }
    const popularTables = Array.from(tableMap.entries())
      .map(([table, count]) => ({ table, count }))
      .sort((a, b) => b.count - a.count);

    // ── Popular occasions (group by occasion where not empty) ──
    const occasionMap = new Map<string, number>();
    for (const r of allReservations) {
      if (r.occasion && r.occasion.trim()) {
        occasionMap.set(r.occasion, (occasionMap.get(r.occasion) || 0) + 1);
      }
    }
    const popularOccasions = Array.from(occasionMap.entries())
      .map(([occasion, count]) => ({ occasion, count }))
      .sort((a, b) => b.count - a.count);

    // ── Most popular day of week ──
    const dayOfWeekMap = new Map<string, number>();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (const r of allReservations) {
      const dayIndex = new Date(r.date).getDay();
      const dayName = dayNames[dayIndex];
      dayOfWeekMap.set(dayName, (dayOfWeekMap.get(dayName) || 0) + 1);
    }
    let mostPopularDay: string | null = null;
    let maxDayCount = 0;
    for (const [day, count] of dayOfWeekMap.entries()) {
      if (count > maxDayCount) {
        maxDayCount = count;
        mostPopularDay = day;
      }
    }

    // ── Most popular hour ──
    const hourNumMap = new Map<number, number>();
    for (const r of allReservations) {
      const time = r.start_time || r.time;
      if (time) {
        const hourNum = parseInt(time.split(":")[0], 10);
        if (!isNaN(hourNum)) {
          hourNumMap.set(hourNum, (hourNumMap.get(hourNum) || 0) + 1);
        }
      }
    }
    let mostPopularHour: number | null = null;
    let maxHourCount = 0;
    for (const [hour, count] of hourNumMap.entries()) {
      if (count > maxHourCount) {
        maxHourCount = count;
        mostPopularHour = hour;
      }
    }

    // ── Repeat customer percentage ──
    const customerEmailMap = new Map<string, number>();
    for (const r of allReservations) {
      if (r.email) {
        const key = r.email.toLowerCase();
        customerEmailMap.set(key, (customerEmailMap.get(key) || 0) + 1);
      }
    }
    const totalCustomers = customerEmailMap.size;
    let repeatCustomers = 0;
    for (const count of customerEmailMap.values()) {
      if (count >= 2) repeatCustomers++;
    }
    const repeatCustomerPercent = totalCustomers > 0
      ? Math.round((repeatCustomers / totalCustomers) * 100 * 10) / 10
      : 0;

    // ── Table utilization ──
    const tableUtilization = Array.from(tableMap.entries())
      .map(([table, count]) => ({ table, count }))
      .sort((a, b) => a.table - b.table);

    // ── Waitlist count ──
    const { count: waitlistCount, error: waitlistError } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (waitlistError) {
      console.error("Waitlist count error:", waitlistError);
    }

    // ── VIP count (customers with >= vipThreshold completed visits, across ALL reservations) ──
    const { data: allRes, error: allResError } = await supabase
      .from("reservations")
      .select("email, status");

    if (allResError) {
      console.error("VIP count error:", allResError);
    }

    let vipCount = 0;
    if (allRes) {
      const completedByEmail = new Map<string, number>();
      for (const r of allRes) {
        if (r.status === "COMPLETED") {
          const key = r.email.toLowerCase();
          completedByEmail.set(key, (completedByEmail.get(key) || 0) + 1);
        }
      }
      for (const count of completedByEmail.values()) {
        if (count >= RESTAURANT_CONFIG.vipThreshold) {
          vipCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      analytics: {
        counts,
        reservationsPerDay,
        peakHours,
        popularTables,
        popularOccasions,
        waitlistCount: waitlistCount || 0,
        vipCount,
        mostPopularDay,
        mostPopularHour,
        repeatCustomerPercent,
        tableUtilization,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
