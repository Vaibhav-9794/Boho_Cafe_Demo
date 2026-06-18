// ============================================
// Boho Cafe & Lounge — Waitlist Notification
// ============================================

import { Resend } from "resend";
import { createServerClient } from "./supabase";
import { sendWhatsApp, whatsappWaitlistNotification } from "./whatsapp";
import { timesOverlap } from "@/data/restaurant";

/**
 * When a reservation is cancelled or marked no-show,
 * notify the first matching waitlist entry.
 */
export async function notifyWaitlist(
  date: string,
  startTime: string,
  endTime: string
): Promise<void> {
  try {
    const supabase = createServerClient();

    // Find un-notified waitlist entries for this date with overlapping time
    const { data: waitlistEntries } = await supabase
      .from("waitlist")
      .select("*")
      .eq("date", date)
      .eq("notified", false)
      .order("created_at", { ascending: true });

    if (!waitlistEntries || waitlistEntries.length === 0) return;

    // Find first entry with overlapping time range
    const match = waitlistEntries.find((entry) =>
      timesOverlap(entry.start_time, entry.end_time, startTime, endTime)
    );

    if (!match) return;

    // Mark as notified
    await supabase
      .from("waitlist")
      .update({ notified: true })
      .eq("id", match.id);

    // Send email
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

      await resend.emails.send({
        from: "Boho Cafe & Lounge <onboarding@resend.dev>",
        to: match.email,
        subject: "🎉 A Table Just Opened! — Boho Cafe & Lounge",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0A0A0A;color:#F5F0E8;padding:40px;border-radius:12px;">
            <div style="text-align:center;margin-bottom:30px;">
              <h1 style="color:#C6A962;margin:0;font-size:24px;">Great News!</h1>
              <p style="color:#A09888;margin:8px 0 0;">A table just opened at Boho Cafe</p>
            </div>
            <div style="background:rgba(198,169,98,0.1);border:1px solid rgba(198,169,98,0.2);border-radius:8px;padding:20px;margin:20px 0;">
              <p style="margin:0;color:#F5F0E8;">Hi <strong>${match.name}</strong>,</p>
              <p style="color:#A09888;margin:10px 0;">A reservation slot just opened on <strong style="color:#C6A962;">${date}</strong> around <strong style="color:#C6A962;">${startTime} – ${endTime}</strong>.</p>
              <p style="color:#A09888;margin:10px 0;">Book now before someone else takes it!</p>
            </div>
            <div style="text-align:center;margin:30px 0;">
              <a href="${siteUrl}/#reservation" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#A8893D,#C6A962);color:#0A0A0A;text-decoration:none;border-radius:8px;font-weight:bold;">Book Now →</a>
            </div>
            <p style="color:#6B5F4F;font-size:12px;text-align:center;margin-top:30px;">Boho Cafe & Lounge • Swaroop Nagar, Kanpur</p>
          </div>
        `,
      });
    }

    // Send WhatsApp
    await sendWhatsApp({
      phone: match.phone,
      message: whatsappWaitlistNotification(match.name, date, `${startTime} – ${endTime}`),
    });

    console.log(`[Waitlist] Notified ${match.name} (${match.email}) for ${date} ${startTime}-${endTime}`);
  } catch (error) {
    console.error("[Waitlist] Notification error:", error);
  }
}
