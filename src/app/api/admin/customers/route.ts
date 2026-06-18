import { NextRequest, NextResponse } from "next/server";
import { createServerClient, Reservation } from "@/lib/supabase";
import { RESTAURANT_CONFIG } from "@/data/restaurant";
import { checkStaffAuth, unauthorized } from "@/lib/auth";

interface CustomerProfile {
  name: string;
  phone: string;
  email: string;
  total_reservations: number;
  completed_visits: number;
  no_shows: number;
  last_visit: string | null;
  status: "VIP" | "NO_SHOW_RISK" | "REGULAR";
}

// GET: Aggregate customer data from reservations
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request);
  if (!auth.authenticated) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase();

    const supabase = createServerClient();

    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("customer_name, phone, email, status, date, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to fetch reservations." }, { status: 500 });
    }

    // Group by LOWER(email)
    const customerMap = new Map<string, {
      name: string;
      phone: string;
      email: string;
      total: number;
      completed: number;
      noShows: number;
      lastVisit: string | null;
      latestCreatedAt: string;
    }>();

    for (const r of (reservations || []) as Pick<Reservation, "customer_name" | "phone" | "email" | "status" | "date" | "created_at">[]) {
      const key = r.email.toLowerCase();
      const existing = customerMap.get(key);

      if (!existing) {
        customerMap.set(key, {
          name: r.customer_name,
          phone: r.phone,
          email: r.email,
          total: 1,
          completed: r.status === "COMPLETED" ? 1 : 0,
          noShows: r.status === "NO_SHOW" ? 1 : 0,
          lastVisit: r.status === "COMPLETED" ? r.date : null,
          latestCreatedAt: r.created_at,
        });
      } else {
        existing.total += 1;
        if (r.status === "COMPLETED") {
          existing.completed += 1;
          if (!existing.lastVisit || r.date > existing.lastVisit) {
            existing.lastVisit = r.date;
          }
        }
        if (r.status === "NO_SHOW") {
          existing.noShows += 1;
        }
        // Keep the latest name/phone (reservations ordered by created_at desc, first seen = latest)
        // Already set on first encounter since query is descending
      }
    }

    // Build customer profiles
    let customers: CustomerProfile[] = Array.from(customerMap.values()).map((c) => {
      let status: "VIP" | "NO_SHOW_RISK" | "REGULAR" = "REGULAR";
      if (c.completed >= RESTAURANT_CONFIG.vipThreshold) {
        status = "VIP";
      } else if (c.noShows >= RESTAURANT_CONFIG.noShowWarning) {
        status = "NO_SHOW_RISK";
      }

      return {
        name: c.name,
        phone: c.phone,
        email: c.email,
        total_reservations: c.total,
        completed_visits: c.completed,
        no_shows: c.noShows,
        last_visit: c.lastVisit,
        status,
      };
    });

    // Apply search filter
    if (search) {
      customers = customers.filter((c) =>
        c.name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.phone.includes(search)
      );
    }

    // Sort by total reservations descending
    customers.sort((a, b) => b.total_reservations - a.total_reservations);

    return NextResponse.json({ success: true, customers });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
