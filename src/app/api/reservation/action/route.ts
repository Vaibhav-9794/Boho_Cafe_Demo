import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient, verifyActionToken } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const action = searchParams.get("action");
  const token = searchParams.get("token");

  if (!id || !action || !token || !["approve", "reject"].includes(action)) {
    return new NextResponse(renderPage("Invalid Request", "The link you followed is invalid or incomplete.", "error"), {
      status: 400, headers: { "Content-Type": "text/html" },
    });
  }

  // Verify token
  if (!verifyActionToken(id, action, token)) {
    return new NextResponse(renderPage("Unauthorized", "This action link is invalid or has expired.", "error"), {
      status: 403, headers: { "Content-Type": "text/html" },
    });
  }

  const supabase = createServerClient();

  // Fetch reservation
  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !reservation) {
    return new NextResponse(renderPage("Not Found", "This reservation could not be found.", "error"), {
      status: 404, headers: { "Content-Type": "text/html" },
    });
  }

  // Check if already processed
  if (reservation.status !== "PENDING") {
    return new NextResponse(
      renderPage(
        `Already ${reservation.status === "CONFIRMED" ? "Approved" : "Rejected"}`,
        `This reservation has already been ${reservation.status.toLowerCase()}. No further action needed.`,
        reservation.status === "CONFIRMED" ? "success" : "rejected"
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  // Update status
  const newStatus = action === "approve" ? "CONFIRMED" : "REJECTED";
  const { error: updateError } = await supabase
    .from("reservations")
    .update({ status: newStatus })
    .eq("id", id);

  if (updateError) {
    console.error("Update error:", updateError);
    return new NextResponse(renderPage("Error", "Failed to update the reservation. Please try again.", "error"), {
      status: 500, headers: { "Content-Type": "text/html" },
    });
  }

  // Send customer email
  try {
    if (action === "approve") {
      await resend.emails.send({
        from: "Boho Cafe & Lounge <onboarding@resend.dev>",
        to: reservation.email,
        subject: "✅ Reservation Confirmed! — Boho Cafe & Lounge",
        html: buildConfirmationEmail(reservation),
      });
    } else {
      await resend.emails.send({
        from: "Boho Cafe & Lounge <onboarding@resend.dev>",
        to: reservation.email,
        subject: "Reservation Update — Boho Cafe & Lounge",
        html: buildRejectionEmail(reservation),
      });
    }
  } catch (err) {
    console.error("Customer email error:", err);
  }

  // Render success page
  if (action === "approve") {
    return new NextResponse(
      renderPage(
        "Reservation Approved ✓",
        `${reservation.customer_name}'s table for ${reservation.guest_count} guests on ${reservation.date} at ${reservation.time} has been confirmed. A confirmation email has been sent.`,
        "success"
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } else {
    return new NextResponse(
      renderPage(
        "Reservation Rejected ✗",
        `${reservation.customer_name}'s reservation for ${reservation.date} at ${reservation.time} has been rejected. A notification email has been sent.`,
        "rejected"
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }
}

function renderPage(title: string, message: string, type: "success" | "rejected" | "error"): string {
  const colors = {
    success: { accent: "#22C55E", bg: "rgba(34,197,94,0.1)" },
    rejected: { accent: "#EF4444", bg: "rgba(239,68,68,0.1)" },
    error: { accent: "#EF4444", bg: "rgba(239,68,68,0.1)" },
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

function buildConfirmationEmail(res: { customer_name: string; date: string; time: string; guest_count: number }): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;padding:32px 24px;background-color:#1A1A1A;border:1px solid rgba(34,197,94,0.3);border-radius:12px 12px 0 0;">
    <div style="width:56px;height:56px;border:2px solid #C6A962;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="color:#C6A962;font-size:24px;font-weight:bold;line-height:56px;">B</span>
    </div>
    <h1 style="color:#22C55E;font-size:22px;margin:0 0 4px 0;">Your Table is Confirmed! ✓</h1>
    <p style="color:#A09888;font-size:13px;margin:0;letter-spacing:2px;text-transform:uppercase;">Boho Cafe & Lounge</p>
  </div>
  <div style="background-color:#1A1A1A;border:1px solid rgba(34,197,94,0.15);border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p style="color:#F5F0E8;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear ${res.customer_name},</p>
    <p style="color:#A09888;font-size:14px;line-height:1.6;margin:0 0 20px 0;">Great news! Your reservation has been <strong style="color:#22C55E;">confirmed</strong>. We look forward to welcoming you!</p>
    <div style="background-color:#0A0A0A;border-radius:8px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Date</td><td style="padding:8px 0;color:#C6A962;font-size:14px;font-weight:600;text-align:right;">${res.date}</td></tr>
        <tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Time</td><td style="padding:8px 0;color:#C6A962;font-size:14px;font-weight:600;text-align:right;">${res.time}</td></tr>
        <tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Guests</td><td style="padding:8px 0;color:#F5F0E8;font-size:14px;text-align:right;">${res.guest_count}</td></tr>
      </table>
    </div>
    <p style="color:#6B5F4F;font-size:12px;text-align:center;margin:0;">📍 Boho Cafe & Lounge, Kanpur · 📞 +91 84006 78200</p>
  </div>
</div></body></html>`;
}

function buildRejectionEmail(res: { customer_name: string; date: string; time: string }): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;padding:32px 24px;background-color:#1A1A1A;border:1px solid rgba(239,68,68,0.3);border-radius:12px 12px 0 0;">
    <div style="width:56px;height:56px;border:2px solid #C6A962;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="color:#C6A962;font-size:24px;font-weight:bold;line-height:56px;">B</span>
    </div>
    <h1 style="color:#F5F0E8;font-size:22px;margin:0 0 4px 0;">Reservation Update</h1>
    <p style="color:#A09888;font-size:13px;margin:0;letter-spacing:2px;text-transform:uppercase;">Boho Cafe & Lounge</p>
  </div>
  <div style="background-color:#1A1A1A;border:1px solid rgba(239,68,68,0.15);border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p style="color:#F5F0E8;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear ${res.customer_name},</p>
    <p style="color:#A09888;font-size:14px;line-height:1.6;margin:0 0 12px 0;">We regret to inform you that we are unable to accommodate your reservation for <strong style="color:#F5F0E8;">${res.date}</strong> at <strong style="color:#F5F0E8;">${res.time}</strong>.</p>
    <p style="color:#A09888;font-size:14px;line-height:1.6;margin:0 0 20px 0;">Please contact us directly to explore alternative options. We'd love to find a way to host you!</p>
    <div style="text-align:center;">
      <a href="https://wa.me/918400678200" style="display:inline-block;padding:12px 32px;background:linear-gradient(to right,#A8893D,#C6A962);color:#0A0A0A;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">WhatsApp Us</a>
    </div>
    <p style="color:#6B5F4F;font-size:12px;text-align:center;margin:20px 0 0 0;">📞 +91 84006 78200</p>
  </div>
</div></body></html>`;
}
