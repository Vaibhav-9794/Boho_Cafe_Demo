import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient, verifyActionToken } from "@/lib/supabase";
import { sendWhatsApp, whatsappReservationCancelled } from "@/lib/whatsapp";
import { notifyWaitlist } from "@/lib/waitlist";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/reservation/cancel
 * Cancel a reservation (customer-initiated).
 */
export async function POST(request: NextRequest) {
  try {
    const { reservationId, email, reason } = await request.json();

    if (!reservationId || !email) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: reservationId, email." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch reservation
    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json(
        { success: false, message: "Reservation not found." },
        { status: 404 }
      );
    }

    // Verify email matches
    if (reservation.email.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json(
        { success: false, message: "Email does not match the reservation." },
        { status: 403 }
      );
    }

    // Check if already cancelled
    if (reservation.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "This reservation is already cancelled." },
        { status: 400 }
      );
    }

    // Check if cancellable
    if (!["PENDING", "CONFIRMED", "HELD"].includes(reservation.status)) {
      return NextResponse.json(
        { success: false, message: `Cannot cancel a reservation with status: ${reservation.status}.` },
        { status: 400 }
      );
    }

    // ── Update to CANCELLED ──
    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
      })
      .eq("id", reservationId);

    if (updateError) {
      console.error("[Cancel] Update error:", updateError);
      return NextResponse.json(
        { success: false, message: `Failed to cancel reservation: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log(`[Cancel] Reservation ${reservationId} cancelled by ${email}`);

    // ── Send cancellation email to owner ──
    const ownerEmail = process.env.CONTACT_RECEIVER_EMAIL || "hs142636@gmail.com";
    try {
      await resend.emails.send({
        from: "Boho Cafe & Lounge <onboarding@resend.dev>",
        to: ownerEmail,
        subject: `❌ Reservation Cancelled — ${reservation.customer_name}`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;padding:32px 24px;background-color:#1A1A1A;border:1px solid rgba(239,68,68,0.3);border-radius:12px 12px 0 0;">
    <div style="width:56px;height:56px;border:2px solid #C6A962;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="color:#C6A962;font-size:24px;font-weight:bold;line-height:56px;">B</span>
    </div>
    <h1 style="color:#EF4444;font-size:22px;margin:0 0 4px 0;">Reservation Cancelled</h1>
    <p style="color:#A09888;font-size:13px;margin:0;letter-spacing:2px;text-transform:uppercase;">Customer Cancellation</p>
  </div>
  <div style="background-color:#1A1A1A;border:1px solid rgba(239,68,68,0.15);border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:10px 0;color:#A09888;font-size:13px;width:120px;">Name</td><td style="padding:10px 0;color:#F5F0E8;font-size:14px;font-weight:600;">${reservation.customer_name}</td></tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Date</td><td style="padding:10px 0;color:#C6A962;font-size:14px;font-weight:600;">${reservation.date}</td></tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Time</td><td style="padding:10px 0;color:#C6A962;font-size:14px;font-weight:600;">${reservation.start_time || reservation.time} → ${reservation.end_time || ""}</td></tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Table</td><td style="padding:10px 0;color:#F5F0E8;font-size:14px;">${reservation.table_number || "N/A"}</td></tr>
      ${reason ? `<tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Reason</td><td style="padding:10px 0;color:#F5F0E8;font-size:14px;">${reason}</td></tr>` : ""}
    </table>
  </div>
</div></body></html>`,
      });
      console.log("[Cancel] Owner notified via email");
    } catch (err) {
      console.error("[Cancel] Owner email error:", err);
    }

    // ── Send WhatsApp to customer ──
    try {
      await sendWhatsApp({
        phone: reservation.phone,
        message: whatsappReservationCancelled(reservation.customer_name, reservation.date),
      });
      console.log("[Cancel] Customer notified via WhatsApp");
    } catch (err) {
      console.error("[Cancel] WhatsApp error:", err);
    }

    // ── Notify waitlist ──
    if (reservation.start_time && reservation.end_time) {
      try {
        await notifyWaitlist(reservation.date, reservation.start_time, reservation.end_time);
        console.log("[Cancel] Waitlist notified");
      } catch (err) {
        console.error("[Cancel] Waitlist notification error:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Cancel] Error:", err);
    return NextResponse.json(
      { success: false, message: `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reservation/cancel?id=X&token=Y
 * One-click cancel from email links.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const token = searchParams.get("token");

  if (!id || !token) {
    return new NextResponse(
      renderPage("Invalid Request", "The cancellation link is invalid or incomplete.", "error"),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  // Verify token
  if (!verifyActionToken(id, "cancel", token)) {
    return new NextResponse(
      renderPage("Unauthorized", "This cancellation link is invalid or has expired.", "error"),
      { status: 403, headers: { "Content-Type": "text/html" } }
    );
  }

  const supabase = createServerClient();

  // Fetch reservation
  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !reservation) {
    return new NextResponse(
      renderPage("Not Found", "This reservation could not be found.", "error"),
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  }

  // Already cancelled
  if (reservation.status === "CANCELLED") {
    return new NextResponse(
      renderPage("Already Cancelled", "This reservation has already been cancelled.", "info"),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  // Not cancellable
  if (!["PENDING", "CONFIRMED", "HELD"].includes(reservation.status)) {
    return new NextResponse(
      renderPage(
        "Cannot Cancel",
        `This reservation has status "${reservation.status}" and cannot be cancelled via this link.`,
        "error"
      ),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  // ── Cancel the reservation ──
  const { error: updateError } = await supabase
    .from("reservations")
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: "Cancelled via email link",
    })
    .eq("id", id);

  if (updateError) {
    console.error("[Cancel GET] Update error:", updateError);
    return new NextResponse(
      renderPage("Error", "Failed to cancel the reservation. Please try again.", "error"),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  // Send WhatsApp to customer
  try {
    await sendWhatsApp({
      phone: reservation.phone,
      message: whatsappReservationCancelled(reservation.customer_name, reservation.date),
    });
  } catch (err) {
    console.error("[Cancel GET] WhatsApp error:", err);
  }

  // Notify owner
  const ownerEmail = process.env.CONTACT_RECEIVER_EMAIL || "hs142636@gmail.com";
  try {
    await resend.emails.send({
      from: "Boho Cafe & Lounge <onboarding@resend.dev>",
      to: ownerEmail,
      subject: `❌ Reservation Cancelled — ${reservation.customer_name}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0A0A0A;color:#F5F0E8;padding:40px;border-radius:12px;">
        <h2 style="color:#EF4444;margin:0 0 16px 0;">Reservation Cancelled</h2>
        <p style="color:#A09888;">${reservation.customer_name} cancelled their reservation for ${reservation.date} at ${reservation.start_time || reservation.time} via email link.</p>
      </div>`,
    });
  } catch (err) {
    console.error("[Cancel GET] Owner email error:", err);
  }

  // Notify waitlist
  if (reservation.start_time && reservation.end_time) {
    try {
      await notifyWaitlist(reservation.date, reservation.start_time, reservation.end_time);
    } catch (err) {
      console.error("[Cancel GET] Waitlist error:", err);
    }
  }

  return new NextResponse(
    renderPage(
      "Reservation Cancelled ✓",
      `Your reservation for ${reservation.date} at ${reservation.start_time || reservation.time} has been cancelled successfully. We hope to see you again soon!`,
      "success"
    ),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function renderPage(title: string, message: string, type: "success" | "error" | "info"): string {
  const colors = {
    success: { accent: "#22C55E", bg: "rgba(34,197,94,0.1)" },
    error: { accent: "#EF4444", bg: "rgba(239,68,68,0.1)" },
    info: { accent: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  };
  const c = colors[type];

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title} — Boho Cafe</title></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,Helvetica,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
<div style="max-width:480px;margin:32px auto;padding:0 16px;text-align:center;">
  <div style="width:64px;height:64px;border:2px solid #C6A962;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;">
    <span style="color:#C6A962;font-size:28px;font-weight:bold;line-height:64px;">B</span>
  </div>
  <div style="background:${c.bg};border:1px solid ${c.accent}40;border-radius:12px;padding:32px 24px;">
    <h1 style="color:${c.accent};font-size:24px;margin:0 0 12px 0;">${title}</h1>
    <p style="color:#A09888;font-size:14px;line-height:1.6;margin:0;">${message}</p>
  </div>
  <p style="color:#6B5F4F;font-size:12px;margin-top:24px;">Boho Cafe & Lounge, Kanpur</p>
</div></body></html>`;
}
