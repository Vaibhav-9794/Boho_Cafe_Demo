import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient, generateActionToken } from "@/lib/supabase";
import { sendWhatsApp, whatsappReservationConfirmed, whatsappReservationRejected } from "@/lib/whatsapp";
import { checkStaffAuth, unauthorized, logAudit } from "@/lib/auth";

const resend = new Resend(process.env.RESEND_API_KEY);


// GET: List reservations or timeline view
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request);
  if (!auth.authenticated) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const date = searchParams.get("date");

  const supabase = createServerClient();

  // Timeline view
  if (view === "timeline" && date) {
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("date", date)
      .in("status", ["HELD", "PENDING", "CONFIRMED", "ARRIVED"])
      .order("start_time", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to fetch timeline." }, { status: 500 });
    }

    // Also fetch blocked date info
    const { data: blockedDate } = await supabase
      .from("blocked_dates")
      .select("*")
      .eq("date", date)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      reservations: reservations || [],
      blockedDate: blockedDate || null,
    });
  }

  // Regular list view with all status counts
  const ALL_STATUSES = ["HELD", "PENDING", "CONFIRMED", "ARRIVED", "COMPLETED", "REJECTED", "CANCELLED", "NO_SHOW"];
  const countQueries = ALL_STATUSES.map((s) =>
    supabase.from("reservations").select("*", { count: "exact", head: true }).eq("status", s)
  );
  const totalQuery = supabase.from("reservations").select("*", { count: "exact", head: true });

  const [totalRes, ...statusResults] = await Promise.all([totalQuery, ...countQueries]);

  const counts: Record<string, number> = { total: totalRes.count || 0 };
  ALL_STATUSES.forEach((s, i) => {
    counts[s.toLowerCase()] = statusResults[i].count || 0;
  });

  let query = supabase.from("reservations").select("*").order("created_at", { ascending: false });

  const validStatuses = [...ALL_STATUSES];
  if (status && validStatuses.includes(status)) {
    query = query.eq("status", status);
  }

  if (search?.trim()) {
    const s = search.trim();
    query = query.or(`customer_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
  }

  const { data: reservations, error } = await query.limit(200);

  if (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch reservations." }, { status: 500 });
  }

  return NextResponse.json({ success: true, reservations: reservations || [], counts });
}

// PATCH: Multiple actions for reservation lifecycle
export async function PATCH(request: NextRequest) {
  const auth = await checkStaffAuth(request);
  if (!auth.authenticated) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const { id, action, tableNumber } = body;

    const validActions = [
      "approve", "reject", "assign_table",
      "mark_arrived", "mark_completed", "mark_noshow",
      "cancel",
    ];

    if (!id || !action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, message: `Invalid action. Valid: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json({ success: false, message: "Reservation not found." }, { status: 404 });
    }

    // Build update
    const updateData: Record<string, unknown> = {};

    switch (action) {
      case "approve":
        if (!tableNumber) {
          return NextResponse.json({ success: false, message: "Table number is required for approval." }, { status: 400 });
        }
        updateData.status = "CONFIRMED";
        updateData.table_number = tableNumber;
        break;

      case "assign_table":
        if (!tableNumber) {
          return NextResponse.json({ success: false, message: "Table number is required." }, { status: 400 });
        }
        updateData.table_number = tableNumber;
        break;

      case "reject":
        updateData.status = "REJECTED";
        break;

      case "mark_arrived":
        updateData.status = "ARRIVED";
        updateData.arrived_at = new Date().toISOString();
        break;

      case "mark_completed":
        updateData.status = "COMPLETED";
        updateData.completed_at = new Date().toISOString();
        break;

      case "mark_noshow":
        updateData.status = "NO_SHOW";
        updateData.no_show_at = new Date().toISOString();
        break;

      case "cancel":
        updateData.status = "CANCELLED";
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancellation_reason = body.reason || "Cancelled by admin";
        break;
    }

    const { error: updateError } = await supabase
      .from("reservations")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ success: false, message: "Failed to update reservation." }, { status: 500 });
    }

    // Audit log the action
    const actionMap: Record<string, string> = {
      approve: 'RESERVATION_APPROVED',
      reject: 'RESERVATION_REJECTED',
      cancel: 'RESERVATION_CANCELLED',
      assign_table: 'TABLE_ASSIGNED',
      mark_arrived: 'RESERVATION_ARRIVED',
      mark_completed: 'RESERVATION_COMPLETED',
      mark_noshow: 'RESERVATION_NOSHOW',
    };
    await logAudit({
      actorEmail: auth.email ?? 'unknown',
      actorRole: auth.role ?? 'STAFF',
      action: actionMap[action] || action.toUpperCase(),
      details: `${action} reservation for ${reservation.customer_name} on ${reservation.date}${tableNumber ? ` (Table ${tableNumber})` : ''}`,
      targetId: id,
    });

    const assignedTable = tableNumber || reservation.table_number;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Send emails + WhatsApp based on action
    try {
      if (action === "approve") {
        const cancelToken = generateActionToken(reservation.id, "cancel");
        const cancelUrl = `${siteUrl}/api/reservation/cancel?id=${reservation.id}&token=${cancelToken}`;

        await resend.emails.send({
          from: "Boho Cafe & Lounge <onboarding@resend.dev>",
          to: reservation.email,
          subject: "✅ Reservation Confirmed! — Boho Cafe & Lounge",
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background-color:#1A1A1A;border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:32px 24px;text-align:center;">
    <h1 style="color:#22C55E;font-size:22px;margin:0 0 12px 0;">Your Table is Confirmed! ✓</h1>
    <p style="color:#A09888;font-size:14px;line-height:1.6;margin:0 0 20px 0;">Dear ${reservation.customer_name}, your reservation has been confirmed!</p>
    <div style="background:#0A0A0A;border-radius:8px;padding:16px;text-align:left;">
      <table style="width:100%;border-collapse:collapse;">
        ${assignedTable ? `<tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Table</td><td style="padding:8px 0;color:#22C55E;font-size:16px;font-weight:bold;text-align:right;">Table ${assignedTable}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Date</td><td style="padding:8px 0;color:#C6A962;font-size:14px;font-weight:600;text-align:right;">${reservation.date}</td></tr>
        <tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Time</td><td style="padding:8px 0;color:#C6A962;font-size:14px;font-weight:600;text-align:right;">${reservation.start_time || reservation.time} → ${reservation.end_time || ""}</td></tr>
        <tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Guests</td><td style="padding:8px 0;color:#F5F0E8;font-size:14px;text-align:right;">${reservation.guest_count}</td></tr>
      </table>
    </div>
    <div style="margin:24px 0 0 0;">
      <a href="${cancelUrl}" style="display:inline-block;padding:10px 24px;background:rgba(239,68,68,0.15);color:#EF4444;text-decoration:none;border-radius:8px;font-size:12px;border:1px solid rgba(239,68,68,0.3);">Cancel Reservation</a>
    </div>
    <p style="color:#6B5F4F;font-size:12px;margin:20px 0 0 0;">Boho Cafe & Lounge, Kanpur · +91 84006 78200</p>
  </div>
</div></body></html>`,
        });

        // WhatsApp
        await sendWhatsApp({
          phone: reservation.phone,
          message: whatsappReservationConfirmed(
            reservation.customer_name,
            reservation.date,
            `${reservation.start_time || reservation.time} → ${reservation.end_time || ""}`,
            assignedTable || 0
          ),
        });
      } else if (action === "reject") {
        await resend.emails.send({
          from: "Boho Cafe & Lounge <onboarding@resend.dev>",
          to: reservation.email,
          subject: "Reservation Update — Boho Cafe & Lounge",
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background-color:#1A1A1A;border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:32px 24px;text-align:center;">
    <h1 style="color:#F5F0E8;font-size:22px;margin:0 0 12px 0;">Reservation Update</h1>
    <p style="color:#A09888;font-size:14px;line-height:1.6;margin:0 0 16px 0;">Dear ${reservation.customer_name}, we regret that we cannot accommodate your reservation for ${reservation.date}. Please contact us to explore alternatives.</p>
    <a href="https://wa.me/918400678200" style="display:inline-block;padding:10px 28px;background:linear-gradient(to right,#A8893D,#C6A962);color:#0A0A0A;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">WhatsApp Us</a>
  </div>
</div></body></html>`,
        });

        await sendWhatsApp({
          phone: reservation.phone,
          message: whatsappReservationRejected(reservation.customer_name, reservation.date),
        });
      }
    } catch (err) {
      console.error("Admin email/whatsapp error:", err);
    }

    // If cancelled or no-show, notify waitlist
    if (action === "cancel" || action === "mark_noshow") {
      try {
        const { notifyWaitlist } = await import("@/lib/waitlist");
        if (reservation.start_time && reservation.end_time) {
          await notifyWaitlist(reservation.date, reservation.start_time, reservation.end_time);
        }
      } catch (err) {
        console.error("Waitlist notification error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      reservation: { ...reservation, ...updateData, table_number: assignedTable },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }
}
