import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, _gotcha } = body;

    // Honeypot
    if (_gotcha) {
      return NextResponse.json({ success: true });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const receiverEmail =
      process.env.CONTACT_RECEIVER_EMAIL || "owner@bohocafe.in";

    // Notify the owner about the new subscriber
    const result = await resend.emails.send({
      from: "Boho Cafe & Lounge <onboarding@resend.dev>",
      to: [receiverEmail],
      subject: `New Newsletter Subscriber — ${email}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
  <div style="max-width:500px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding:32px 24px;background-color:#1A1A1A;border:1px solid rgba(198,169,98,0.3);border-radius:12px;">
      <div style="width:48px;height:48px;border:2px solid #C6A962;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="color:#C6A962;font-size:20px;font-weight:bold;line-height:48px;">B</span>
      </div>
      <h2 style="color:#C6A962;font-size:18px;margin:0 0 16px 0;">New Newsletter Subscriber</h2>
      <p style="color:#F5F0E8;font-size:16px;margin:0 0 8px 0;font-weight:600;">${email}</p>
      <p style="color:#A09888;font-size:13px;margin:0;">Subscribed via bohocafe.in</p>
    </div>
  </div>
</body>
</html>`,
    });

    if (result.error) {
      console.error("Resend newsletter error:", result.error);
      return NextResponse.json(
        { success: false, message: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }
    // Store subscriber in database
    try {
      const supabase = createServerClient();
      await supabase.from('newsletter_subscribers').upsert(
        { email, status: 'ACTIVE' },
        { onConflict: 'email' }
      );
    } catch (dbErr) {
      console.error('Newsletter DB storage error:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for subscribing!",
    });
  } catch (error) {
    console.error("Newsletter API error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
