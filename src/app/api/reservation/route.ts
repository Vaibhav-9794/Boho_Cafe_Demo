import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient, generateActionToken } from "@/lib/supabase";
import { timesOverlapWithBuffer, RESTAURANT_CONFIG, TABLES } from "@/data/restaurant";
import { sendWhatsApp, whatsappReservationReceived } from "@/lib/whatsapp";

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(ip, recent);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

// Check if a column exists by attempting a small query
async function hasNewColumns(supabase: ReturnType<typeof createServerClient>): Promise<boolean> {
  const { error } = await supabase
    .from("reservations")
    .select("booking_type")
    .limit(0);
  return !error;
}

interface ReservationBody {
  name: string;
  email: string;
  phone: string;
  date: string;
  time?: string;
  startTime: string;
  endTime: string;
  guests: number;
  occasion: string;
  specialRequests: string;
  bookingType: string;
  tableNumber: number | null;
  isFullCafe: boolean;
  _gotcha?: string;
  holdId?: string;
  eventType?: string;
  eventDetails?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body: ReservationBody = await request.json();
    if (body._gotcha) {
      return NextResponse.json({ success: true, reservationId: "fake" });
    }

    const { name, email, phone, date, startTime, endTime, guests, occasion, specialRequests, bookingType, tableNumber, isFullCafe, holdId: bodyHoldId, eventType, eventDetails } = body;

    // Validation
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, message: "Please fill in all required fields (name, email, phone, date, start time, end time)." },
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

    // Detect if migration has been applied
    const useNewColumns = await hasNewColumns(supabase);
    console.log("Database has new columns:", useNewColumns);

    // ── CONFLICT DETECTION (only if new columns exist) ──
    if (useNewColumns) {
      // Check blocked dates
      const { data: blockedDate } = await supabase
        .from("blocked_dates")
        .select("reason")
        .eq("date", date)
        .maybeSingle();

      if (blockedDate) {
        return NextResponse.json(
          { success: false, message: `Bookings are not available on this date: ${blockedDate.reason}` },
          { status: 409 }
        );
      }

      const { data: existing } = await supabase
        .from("reservations")
        .select("table_number, start_time, end_time, is_full_cafe, status")
        .eq("date", date)
        .in("status", ["CONFIRMED", "ARRIVED", "PENDING", "HELD"]);

      const confirmed = existing || [];

      // Check: Full cafe booking blocking
      const fullCafeBlock = confirmed.find(
        (r) => r.is_full_cafe && r.start_time && r.end_time && ["CONFIRMED", "ARRIVED"].includes(r.status) && timesOverlapWithBuffer(startTime, endTime, r.start_time, r.end_time, RESTAURANT_CONFIG.bufferMinutes)
      );
      if (fullCafeBlock) {
        return NextResponse.json(
          { success: false, message: "The entire cafe is reserved during the selected time. Please choose a different time." },
          { status: 409 }
        );
      }

      // Check: Full cafe request vs existing tables
      if (isFullCafe || bookingType === "FULL_CAFE") {
        const tableConflict = confirmed.find(
          (r) => !r.is_full_cafe && r.start_time && r.end_time && ["CONFIRMED", "ARRIVED"].includes(r.status) && timesOverlapWithBuffer(startTime, endTime, r.start_time, r.end_time, RESTAURANT_CONFIG.bufferMinutes)
        );
        if (tableConflict) {
          return NextResponse.json(
            { success: false, message: "There are existing table reservations during this time. Full cafe booking is not available for this slot." },
            { status: 409 }
          );
        }
      }

      // Check: Table-specific conflict
      if (tableNumber && bookingType === "TABLE") {
        const tableConflict = confirmed.find(
          (r) => r.table_number === tableNumber && r.start_time && r.end_time && ["CONFIRMED", "ARRIVED", "PENDING"].includes(r.status) && timesOverlapWithBuffer(startTime, endTime, r.start_time, r.end_time, RESTAURANT_CONFIG.bufferMinutes)
        );
        if (tableConflict) {
          return NextResponse.json(
            { success: false, message: `Table ${tableNumber} is already reserved during the selected time. Please choose another table.` },
            { status: 409 }
          );
        }
      }

      // ── CAPACITY VALIDATION ──
      if (tableNumber && bookingType === "TABLE" && guests) {
        const selectedTable = TABLES.find(t => t.number === tableNumber);
        if (selectedTable && guests > selectedTable.capacity) {
          return NextResponse.json(
            { success: false, message: `Selected table can only accommodate ${selectedTable.capacity} guests. Please select a larger table.` },
            { status: 400 }
          );
        }
      }
    }

    // ── HOLD CONVERSION OR INSERT ──
    // If holdId is provided, convert the hold to PENDING
    if (bodyHoldId && useNewColumns) {
      const { error: holdErr } = await supabase
        .from("reservations")
        .update({
          customer_name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          time: startTime,
          guest_count: guests || 2,
          occasion: occasion || "",
          special_requests: specialRequests || "",
          status: "PENDING",
          held_until: null,
          session_id: null,
          event_type: eventType || null,
          event_details: eventDetails || null,
        })
        .eq("id", bodyHoldId)
        .eq("status", "HELD");

      if (!holdErr) {
        // Hold converted successfully — fetch the reservation
        const { data: converted } = await supabase
          .from("reservations")
          .select("*")
          .eq("id", bodyHoldId)
          .single();

        if (converted) {
          // Send emails and WhatsApp using the converted reservation
          const reservationId = converted.id;
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          const approveToken = generateActionToken(reservationId, "approve");
          const rejectToken = generateActionToken(reservationId, "reject");
          const approveUrl = `${siteUrl}/api/reservation/action?id=${reservationId}&action=approve&token=${approveToken}`;
          const rejectUrl = `${siteUrl}/api/reservation/action?id=${reservationId}&action=reject&token=${rejectToken}`;
          const statusUrl = `${siteUrl}/reservation/status?id=${reservationId}&email=${encodeURIComponent(email.trim().toLowerCase())}`;
          const ownerEmail = process.env.CONTACT_RECEIVER_EMAIL || "hs142636@gmail.com";
          const bookingLabel = (bookingType === "FULL_CAFE" || isFullCafe) ? "Full Cafe" : bookingType === "EVENT" ? `🎉 Event${eventType ? `: ${eventType}` : ""}` : `Table ${tableNumber || "TBD"}`;

          try {
            await resend.emails.send({
              from: "Boho Cafe & Lounge <onboarding@resend.dev>",
              to: ownerEmail,
              subject: `🔔 New ${bookingLabel} Reservation — ${name.trim()}`,
              html: buildOwnerEmail({ name: name.trim(), email: email.trim(), phone: phone.trim(), date, startTime, endTime, guests: guests || 2, occasion, specialRequests, bookingType: bookingType || "TABLE", tableNumber, isFullCafe: isFullCafe || false, approveUrl, rejectUrl, eventType, eventDetails }),
            });
          } catch (err) { console.error("Owner email error:", err); }

          try {
            await resend.emails.send({
              from: "Boho Cafe & Lounge <onboarding@resend.dev>",
              to: email.trim(),
              subject: "Reservation Request Received — Boho Cafe & Lounge",
              html: buildCustomerPendingEmail({ name: name.trim(), date, startTime, endTime, guests: guests || 2, reservationId, statusUrl, bookingType: bookingType || "TABLE", tableNumber }),
            });
          } catch (err) { console.error("Customer email error:", err); }

          // WhatsApp
          await sendWhatsApp({ phone: phone.trim(), message: whatsappReservationReceived(name.trim(), date, `${startTime} → ${endTime}`) });

          return NextResponse.json({ success: true, reservationId });
        }
      }
    }

    // Standard insert (no hold)
    const insertData: Record<string, unknown> = {
      customer_name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      date,
      time: startTime,
      guest_count: guests || 2,
      occasion: occasion || "",
      special_requests: specialRequests || "",
      status: "PENDING",
    };

    if (useNewColumns) {
      insertData.start_time = startTime;
      insertData.end_time = endTime;
      insertData.booking_type = bookingType || "TABLE";
      insertData.table_number = tableNumber || null;
      insertData.is_full_cafe = isFullCafe || bookingType === "FULL_CAFE";
      insertData.event_type = eventType || null;
      insertData.event_details = eventDetails || null;
    }

    console.log("Inserting reservation:", JSON.stringify(insertData));

    const { data: reservation, error: insertError } = await supabase
      .from("reservations")
      .insert(insertData)
      .select()
      .single();

    if (insertError || !reservation) {
      console.error("Supabase insert error:", JSON.stringify(insertError));
      return NextResponse.json(
        { success: false, message: `Failed to create reservation: ${insertError?.message || "Unknown error"}`, error: insertError?.message },
        { status: 500 }
      );
    }

    console.log("Reservation created:", reservation.id);

    const reservationId = reservation.id;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const approveToken = generateActionToken(reservationId, "approve");
    const rejectToken = generateActionToken(reservationId, "reject");
    const approveUrl = `${siteUrl}/api/reservation/action?id=${reservationId}&action=approve&token=${approveToken}`;
    const rejectUrl = `${siteUrl}/api/reservation/action?id=${reservationId}&action=reject&token=${rejectToken}`;
    const statusUrl = `${siteUrl}/reservation/status?id=${reservationId}&email=${encodeURIComponent(email.trim().toLowerCase())}`;
    const ownerEmail = process.env.CONTACT_RECEIVER_EMAIL || "hs142636@gmail.com";

    const bookingLabel = (bookingType === "FULL_CAFE" || isFullCafe) ? "Full Cafe" : bookingType === "EVENT" ? "Event" : `Table ${tableNumber || "TBD"}`;

    // Send owner email
    try {
      await resend.emails.send({
        from: "Boho Cafe & Lounge <onboarding@resend.dev>",
        to: ownerEmail,
        subject: `🔔 New ${bookingLabel} Reservation — ${name.trim()}`,
        html: buildOwnerEmail({
          name: name.trim(), email: email.trim(), phone: phone.trim(),
          date, startTime, endTime, guests: guests || 2,
          occasion, specialRequests, bookingType: bookingType || "TABLE",
          tableNumber, isFullCafe: isFullCafe || false,
          approveUrl, rejectUrl,
        }),
      });
      console.log("Owner email sent");
    } catch (err) {
      console.error("Owner email error:", err);
    }

    // Send customer email
    try {
      await resend.emails.send({
        from: "Boho Cafe & Lounge <onboarding@resend.dev>",
        to: email.trim(),
        subject: "Reservation Request Received — Boho Cafe & Lounge",
        html: buildCustomerPendingEmail({
          name: name.trim(), date, startTime, endTime,
          guests: guests || 2, reservationId, statusUrl,
          bookingType: bookingType || "TABLE", tableNumber,
        }),
      });
      console.log("Customer email sent");
    } catch (err) {
      console.error("Customer email error:", err);
    }

    // Send WhatsApp notification
    await sendWhatsApp({
      phone: phone.trim(),
      message: whatsappReservationReceived(name.trim(), date, `${startTime} → ${endTime}`),
    });

    return NextResponse.json({ success: true, reservationId });
  } catch (err) {
    console.error("Reservation error:", err);
    return NextResponse.json(
      { success: false, message: `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

function buildOwnerEmail(data: {
  name: string; email: string; phone: string;
  date: string; startTime: string; endTime: string; guests: number;
  occasion: string; specialRequests: string;
  bookingType: string; tableNumber: number | null; isFullCafe: boolean;
  approveUrl: string; rejectUrl: string;
  eventType?: string; eventDetails?: Record<string, unknown>;
}): string {
  const typeLabel = data.isFullCafe ? "🏠 Full Cafe" : data.bookingType === "EVENT" ? "🎉 Event" : `🪑 Table ${data.tableNumber || "TBD"}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;padding:32px 24px;border:1px solid rgba(198,169,98,0.3);border-radius:12px 12px 0 0;background-color:#1A1A1A;">
    <div style="width:56px;height:56px;border:2px solid #C6A962;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="color:#C6A962;font-size:24px;font-weight:bold;line-height:56px;">B</span>
    </div>
    <h1 style="color:#C6A962;font-size:22px;margin:0 0 4px 0;">New Reservation Request</h1>
    <p style="color:#A09888;font-size:13px;margin:0;letter-spacing:2px;text-transform:uppercase;">Awaiting Your Approval</p>
  </div>
  <div style="background-color:#1A1A1A;border:1px solid rgba(198,169,98,0.15);border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <div style="background:#0A0A0A;border-radius:8px;padding:12px 16px;margin-bottom:16px;text-align:center;">
      <span style="color:#C6A962;font-size:16px;font-weight:bold;">${typeLabel}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:10px 0;color:#A09888;font-size:13px;width:120px;">Name</td><td style="padding:10px 0;color:#F5F0E8;font-size:14px;font-weight:600;">${data.name}</td></tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Phone</td><td style="padding:10px 0;color:#F5F0E8;font-size:14px;">${data.phone}</td></tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Email</td><td style="padding:10px 0;color:#F5F0E8;font-size:14px;">${data.email}</td></tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Date</td><td style="padding:10px 0;color:#C6A962;font-size:14px;font-weight:600;">${data.date}</td></tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Time</td><td style="padding:10px 0;color:#C6A962;font-size:14px;font-weight:600;">${data.startTime} → ${data.endTime}</td></tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Guests</td><td style="padding:10px 0;color:#F5F0E8;font-size:14px;">${data.guests}</td></tr>
      ${data.tableNumber && !data.isFullCafe ? `<tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Table Capacity</td><td style="padding:10px 0;color:#C6A962;font-size:14px;font-weight:600;">${(() => { const t = TABLES.find(x => x.number === (data.tableNumber||0)); return t ? t.capacity : '?'; })()} seats</td></tr>` : ""}
      ${data.occasion ? `<tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Occasion</td><td style="padding:10px 0;color:#F5F0E8;font-size:14px;">${data.occasion}</td></tr>` : ""}
      ${data.specialRequests ? `<tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Notes</td><td style="padding:10px 0;color:#F5F0E8;font-size:14px;">${data.specialRequests}</td></tr>` : ""}
      ${data.eventType ? `<tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Event Type</td><td style="padding:10px 0;color:#C6A962;font-size:14px;font-weight:600;">${data.eventType}</td></tr>` : ""}
      ${data.eventDetails?.decorationRequired ? `<tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Decoration</td><td style="padding:10px 0;color:#F5F0E8;font-size:14px;">🎨 Yes</td></tr>` : ""}
      ${data.eventDetails?.cakeRequired ? `<tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Cake</td><td style="padding:10px 0;color:#F5F0E8;font-size:14px;">🎂 Yes</td></tr>` : ""}
      ${data.eventDetails?.budget ? `<tr style="border-top:1px solid rgba(255,255,255,0.05);"><td style="padding:10px 0;color:#A09888;font-size:13px;">Budget</td><td style="padding:10px 0;color:#C6A962;font-size:14px;">₹${data.eventDetails.budget}</td></tr>` : ""}
    </table>
    <div style="margin-top:28px;text-align:center;">
      <a href="${data.approveUrl}" style="display:inline-block;padding:14px 40px;background-color:#22C55E;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;margin:6px;">✅ APPROVE</a>
      <a href="${data.rejectUrl}" style="display:inline-block;padding:14px 40px;background-color:#EF4444;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;margin:6px;">❌ REJECT</a>
    </div>
  </div>
</div></body></html>`;
}

function buildCustomerPendingEmail(data: {
  name: string; date: string; startTime: string; endTime: string;
  guests: number; reservationId: string; statusUrl: string;
  bookingType: string; tableNumber: number | null;
}): string {
  const typeLabel = data.bookingType === "FULL_CAFE" ? "Full Cafe" : data.bookingType === "EVENT" ? "Event" : `Table ${data.tableNumber || "TBD"}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;padding:32px 24px;background-color:#1A1A1A;border:1px solid rgba(198,169,98,0.3);border-radius:12px 12px 0 0;">
    <div style="width:56px;height:56px;border:2px solid #C6A962;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="color:#C6A962;font-size:24px;font-weight:bold;line-height:56px;">B</span>
    </div>
    <h1 style="color:#C6A962;font-size:22px;margin:0 0 4px 0;">Reservation Request Received</h1>
    <p style="color:#A09888;font-size:13px;margin:0;letter-spacing:2px;text-transform:uppercase;">Boho Cafe & Lounge</p>
  </div>
  <div style="background-color:#1A1A1A;border:1px solid rgba(198,169,98,0.15);border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p style="color:#F5F0E8;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear ${data.name},</p>
    <p style="color:#A09888;font-size:14px;line-height:1.6;margin:0 0 20px 0;">Thank you for your reservation request! Your booking is currently <strong style="color:#FBBF24;">awaiting confirmation</strong> from our team.</p>
    <div style="background-color:#0A0A0A;border-radius:8px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Booking</td><td style="padding:8px 0;color:#C6A962;font-size:14px;font-weight:600;text-align:right;">${typeLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Date</td><td style="padding:8px 0;color:#C6A962;font-size:14px;font-weight:600;text-align:right;">${data.date}</td></tr>
        <tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Time</td><td style="padding:8px 0;color:#C6A962;font-size:14px;font-weight:600;text-align:right;">${data.startTime} → ${data.endTime}</td></tr>
        <tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Guests</td><td style="padding:8px 0;color:#F5F0E8;font-size:14px;text-align:right;">${data.guests}</td></tr>
        ${data.tableNumber ? `<tr><td style="padding:8px 0;color:#A09888;font-size:13px;">Table Capacity</td><td style="padding:8px 0;color:#C6A962;font-size:14px;font-weight:600;text-align:right;">${(() => { const t = TABLES.find(x => x.number === (data.tableNumber||0)); return t ? t.capacity : '?'; })()} seats</td></tr>` : ""}
      </table>
    </div>
    <div style="background-color:#0A0A0A;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
      <p style="color:#A09888;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:2px;">Your Reservation ID</p>
      <p style="color:#C6A962;font-size:16px;font-weight:bold;margin:0;font-family:monospace;">${data.reservationId}</p>
    </div>
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${data.statusUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(to right,#A8893D,#C6A962);color:#0A0A0A;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">Track Your Reservation</a>
    </div>
    <p style="color:#6B5F4F;font-size:12px;text-align:center;margin:0;">Questions? Call us at +91 84006 78200 or WhatsApp us.</p>
  </div>
</div></body></html>`;
}
