// ============================================
// Boho Cafe & Lounge — WhatsApp Integration
// Uses Meta Cloud API
// ============================================

interface WhatsAppMessage {
  phone: string;
  message: string;
}

/**
 * Send a WhatsApp message via Meta Cloud API.
 * Silently skips if env vars are not configured.
 */
export async function sendWhatsApp({ phone, message }: WhatsAppMessage): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_API_TOKEN;

  // Graceful skip if not configured
  if (!phoneNumberId || !token) {
    console.log("[WhatsApp] Skipped — env vars not configured");
    return false;
  }

  // Clean phone number (remove spaces, dashes, ensure country code)
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
  if (cleanPhone.startsWith("+")) cleanPhone = cleanPhone.slice(1);
  if (cleanPhone.startsWith("0")) cleanPhone = "91" + cleanPhone.slice(1);
  if (!cleanPhone.startsWith("91") && cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[WhatsApp] Send failed:", err);
      return false;
    }

    console.log(`[WhatsApp] Message sent to ${cleanPhone}`);
    return true;
  } catch (error) {
    console.error("[WhatsApp] Error:", error);
    return false;
  }
}

// ── Pre-built message templates ──

export function whatsappReservationReceived(name: string, date: string, time: string): string {
  return `Hi ${name} 👋\n\nYour reservation at Boho Cafe & Lounge for ${date} at ${time} has been received! ⏳\n\nWe'll confirm your booking shortly.\n\n— Boho Cafe & Lounge 🌿`;
}

export function whatsappReservationConfirmed(name: string, date: string, time: string, table: number): string {
  return `✅ Confirmed!\n\nHi ${name}, your reservation is confirmed:\n\n📅 ${date}\n⏰ ${time}\n🪑 Table ${table}\n\nSee you there! 🎉\n\n— Boho Cafe & Lounge 🌿`;
}

export function whatsappReservationRejected(name: string, date: string): string {
  return `Hi ${name},\n\nUnfortunately, your reservation for ${date} couldn't be accommodated at this time.\n\nPlease contact us for alternatives:\n📞 +91 84006 78200\n\n— Boho Cafe & Lounge 🌿`;
}

export function whatsappReservationCancelled(name: string, date: string): string {
  return `Hi ${name},\n\nYour reservation for ${date} has been cancelled.\n\nWe hope to see you soon! 🌿\n\n— Boho Cafe & Lounge`;
}

export function whatsappReminder24h(name: string, date: string, time: string, table: number): string {
  return `⏰ Reminder!\n\nHi ${name}, your table at Boho Cafe is tomorrow!\n\n📅 ${date}\n⏰ ${time}\n🪑 Table ${table}\n\nWe look forward to seeing you! 🌿\n\n— Boho Cafe & Lounge`;
}

export function whatsappReminder2h(name: string, time: string, table: number): string {
  return `🔔 Almost time!\n\nHi ${name}, your table is ready in 2 hours!\n\n⏰ ${time}\n🪑 Table ${table}\n\nSee you soon! 🌿\n\n— Boho Cafe & Lounge`;
}

export function whatsappWaitlistNotification(name: string, date: string, time: string): string {
  return `🎉 Great news, ${name}!\n\nA slot just opened at Boho Cafe on ${date} around ${time}.\n\nBook now before it's taken!\n🌐 Visit our website to reserve.\n\n— Boho Cafe & Lounge 🌿`;
}
