import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

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

interface ContactBody {
  name: string;
  email: string;
  subject: string;
  message: string;
  _gotcha?: string;
}

function buildContactEmail(data: ContactBody): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="text-align:center;padding:32px 24px;border:1px solid rgba(198,169,98,0.3);border-radius:12px 12px 0 0;background-color:#1A1A1A;">
      <div style="width:56px;height:56px;border:2px solid #C6A962;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="color:#C6A962;font-size:24px;font-weight:bold;line-height:56px;">B</span>
      </div>
      <h1 style="color:#C6A962;font-size:22px;margin:0 0 4px 0;font-weight:600;">New Contact Inquiry</h1>
      <p style="color:#A09888;font-size:13px;margin:0;letter-spacing:2px;text-transform:uppercase;">Via Website</p>
    </div>

    <!-- Body -->
    <div style="background-color:#1A1A1A;padding:32px 24px;border:1px solid rgba(198,169,98,0.15);border-top:none;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #2A2A2A;color:#A09888;font-size:13px;text-transform:uppercase;letter-spacing:1px;width:100px;vertical-align:top;">From</td>
          <td style="padding:12px 8px;border-bottom:1px solid #2A2A2A;color:#F5F0E8;font-size:15px;font-weight:600;">${data.name}</td>
        </tr>
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #2A2A2A;color:#A09888;font-size:13px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Email</td>
          <td style="padding:12px 8px;border-bottom:1px solid #2A2A2A;color:#F5F0E8;font-size:15px;"><a href="mailto:${data.email}" style="color:#C6A962;text-decoration:none;">${data.email}</a></td>
        </tr>
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #2A2A2A;color:#A09888;font-size:13px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Subject</td>
          <td style="padding:12px 8px;border-bottom:1px solid #2A2A2A;color:#F5F0E8;font-size:15px;">${data.subject || "General Inquiry"}</td>
        </tr>
      </table>

      <!-- Message -->
      <div style="background-color:#0A0A0A;border:1px solid rgba(198,169,98,0.15);border-radius:8px;padding:20px;">
        <p style="color:#C6A962;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px 0;">Message</p>
        <p style="color:#F5F0E8;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap;">${data.message}</p>
      </div>

      <!-- Reply Action -->
      <div style="text-align:center;margin-top:24px;">
        <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject || "Your inquiry at Boho Cafe")}"
           style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#A88B3E,#C6A962,#D4B96E);color:#0A0A0A;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;letter-spacing:1px;text-transform:uppercase;">
          Reply to ${data.name}
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px;border:1px solid rgba(198,169,98,0.15);border-top:none;border-radius:0 0 12px 12px;background-color:#1A1A1A;">
      <p style="color:#6B6358;font-size:12px;margin:0;">Submitted via bohocafe.in contact form</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Rate limiting
    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many messages sent. Please wait a few minutes before trying again.",
        },
        { status: 429 }
      );
    }

    const body: ContactBody = await request.json();

    // Honeypot check
    if (body._gotcha) {
      return NextResponse.json({ success: true, message: "Message sent." });
    }

    // Validation
    const errors: string[] = [];
    if (!body.name?.trim()) errors.push("Name is required");
    if (!body.email?.trim()) errors.push("Email is required");
    if (!body.message?.trim()) errors.push("Message is required");
    if (
      body.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
    ) {
      errors.push("Please provide a valid email address");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors.join(". ") + "." },
        { status: 400 }
      );
    }

    const receiverEmail =
      process.env.CONTACT_RECEIVER_EMAIL || "owner@bohocafe.in";

    const result = await resend.emails.send({
      from: "Boho Cafe & Lounge <onboarding@resend.dev>",
      to: [receiverEmail],
      replyTo: body.email,
      subject: `New Contact Inquiry — ${body.subject || "General"} | Boho Cafe Website`,
      html: buildContactEmail(body),
    });

    if (result.error) {
      console.error("Resend contact email error:", result.error);
      return NextResponse.json(
        {
          success: false,
          message:
            "Failed to send your message. Please try again or reach us directly at +91 84006 78200.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Message sent successfully! We'll get back to you within 24 hours.",
    });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "An unexpected error occurred. Please try again or contact us directly.",
      },
      { status: 500 }
    );
  }
}
