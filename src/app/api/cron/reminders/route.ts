import { NextRequest, NextResponse } from "next/server";
import { createServerClient, Reservation } from "@/lib/supabase";
import { sendWhatsApp, whatsappReminder24h, whatsappReminder2h } from "@/lib/whatsapp";
import { timeToMinutes } from "@/data/restaurant";

/**
 * GET /api/cron/reminders
 * Send WhatsApp reminders for upcoming reservations.
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
    const now = new Date();

    // ── Compute today and tomorrow dates in YYYY-MM-DD (IST = UTC+5:30) ──
    const istOffset = 5.5 * 60 * 60 * 1000; // 5h 30m in ms
    const nowIST = new Date(now.getTime() + istOffset);
    const todayStr = nowIST.toISOString().split("T")[0]; // e.g. "2026-06-17"
    const tomorrow = new Date(nowIST);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    let sent24h = 0;
    let sent2h = 0;

    // ── 24h reminders: Tomorrow's CONFIRMED reservations ──
    const { data: tomorrowReservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("date", tomorrowStr)
      .eq("status", "CONFIRMED")
      .eq("reminder_24h_sent", false);

    if (tomorrowReservations && tomorrowReservations.length > 0) {
      for (const res of tomorrowReservations as Reservation[]) {
        const time = res.start_time || res.time;
        const tableNum = res.table_number || 0;

        try {
          await sendWhatsApp({
            phone: res.phone,
            message: whatsappReminder24h(res.customer_name, res.date, time, tableNum),
          });

          await supabase
            .from("reservations")
            .update({ reminder_24h_sent: true })
            .eq("id", res.id);

          sent24h++;
          console.log(`[Reminders] 24h reminder sent to ${res.customer_name} (${res.phone})`);
        } catch (err) {
          console.error(`[Reminders] 24h reminder failed for ${res.id}:`, err);
        }
      }
    }

    // ── 2h reminders: Today's CONFIRMED reservations starting in 2-3 hours ──
    const { data: todayReservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("date", todayStr)
      .eq("status", "CONFIRMED")
      .eq("reminder_2h_sent", false);

    if (todayReservations && todayReservations.length > 0) {
      // Current time in minutes since midnight
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      for (const res of todayReservations as Reservation[]) {
        const time = res.start_time || res.time;
        const resMinutes = timeToMinutes(time);
        const diff = resMinutes - nowMinutes;

        // Send if reservation is 2-3 hours away (120-180 minutes)
        if (diff >= 120 && diff <= 180) {
          const tableNum = res.table_number || 0;

          try {
            await sendWhatsApp({
              phone: res.phone,
              message: whatsappReminder2h(res.customer_name, time, tableNum),
            });

            await supabase
              .from("reservations")
              .update({ reminder_2h_sent: true })
              .eq("id", res.id);

            sent2h++;
            console.log(`[Reminders] 2h reminder sent to ${res.customer_name} (${res.phone})`);
          } catch (err) {
            console.error(`[Reminders] 2h reminder failed for ${res.id}:`, err);
          }
        }
      }
    }

    console.log(`[Reminders] Completed: ${sent24h} x 24h, ${sent2h} x 2h`);

    return NextResponse.json({
      success: true,
      sent24h,
      sent2h,
    });
  } catch (err) {
    console.error("[Reminders] Error:", err);
    return NextResponse.json(
      { success: false, message: `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
