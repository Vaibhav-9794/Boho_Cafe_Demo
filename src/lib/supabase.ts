import { createClient } from "@supabase/supabase-js";
import { createBrowserClient as createSSRBrowserClient, createServerClient as createSSRServerClient } from '@supabase/ssr';

// ── Full Reservation interface ──
export interface Reservation {
  id: string;
  customer_name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  guest_count: number;
  occasion: string;
  special_requests: string;
  status: ReservationStatus;
  booking_type: string | null;
  table_number: number | null;
  start_time: string | null;
  end_time: string | null;
  is_full_cafe: boolean | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  event_type: string | null;
  event_details: EventDetails | null;
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
  held_until: string | null;
  session_id: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  no_show_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus =
  | "HELD"
  | "PENDING"
  | "CONFIRMED"
  | "ARRIVED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "NO_SHOW";

export interface EventDetails {
  eventType?: string;
  expectedGuests?: number;
  decorationRequired?: boolean;
  cakeRequired?: boolean;
  budget?: string;
  eventNotes?: string;
}

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  start_time: string;
  end_time: string;
  notified: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  is_available: boolean;
  is_veg: boolean;
  is_popular: boolean;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface BlockedDate {
  id: string;
  date: string;
  reason: string;
  created_at: string;
}

// ── Staff & Auth interfaces ──

export interface StaffProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  last_login: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  details: string;
  target_id: string | null;
  created_at: string;
}

export interface CustomerNote {
  id: string;
  customer_email: string;
  note: string;
  is_vip_flag: boolean;
  staff_name: string;
  staff_role: string;
  created_at: string;
}

// Browser client (uses anon key, respects RLS) — singleton
let _browserClient: ReturnType<typeof createClient> | null = null;
export function createBrowserClient() {
  if (!_browserClient) {
    _browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _browserClient;
}

// Server client (uses service role key, bypasses RLS — for API routes only)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Generate HMAC token for approve/reject/cancel email links
export function generateActionToken(
  reservationId: string,
  action: string
): string {
  const secret = process.env.ADMIN_SECRET || "boho-admin-secret";
  const data = `${reservationId}:${action}:${secret}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Verify HMAC token
export function verifyActionToken(
  reservationId: string,
  action: string,
  token: string
): boolean {
  return generateActionToken(reservationId, action) === token;
}

// ── SSR Auth Clients (cookie-based sessions) ──

// SSR Browser client for auth (uses cookies) — singleton
let _authBrowserClient: ReturnType<typeof createSSRBrowserClient> | null = null;
export function createAuthBrowserClient() {
  if (!_authBrowserClient) {
    _authBrowserClient = createSSRBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _authBrowserClient;
}

// SSR Server client for auth (uses cookies in API routes)
export function createAuthServerClient(cookieStore: {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options?: object }[]) => void;
}) {
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieStore }
  );
}
