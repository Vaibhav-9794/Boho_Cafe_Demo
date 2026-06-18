import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createServerClient as createSSRServerClient } from '@supabase/ssr';

export type StaffRole = 'OWNER' | 'MANAGER';
export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  role?: StaffRole;
  status?: StaffStatus;
  email?: string;
  name?: string;
}

// For use in API routes - checks Supabase Auth session + staff_profiles
export async function checkStaffAuth(
  request: NextRequest,
  allowedRoles?: StaffRole[]
): Promise<AuthResult> {
  try {
    // Create Supabase client with cookies from the request
    const supabase = createSSRServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }));
          },
          setAll() {
            // API routes don't need to set cookies here - middleware handles refresh
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { authenticated: false };

    // Query staff_profiles using service role client (bypasses RLS)
    const serviceClient = createServerClient();
    const { data: profile } = await serviceClient
      .from('staff_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) return { authenticated: false };
    if (profile.status !== 'ACTIVE') return { authenticated: false };
    if (allowedRoles && !allowedRoles.includes(profile.role)) return { authenticated: false };

    return {
      authenticated: true,
      userId: user.id,
      role: profile.role as StaffRole,
      status: profile.status as StaffStatus,
      email: profile.email,
      name: profile.name,
    };
  } catch {
    return { authenticated: false };
  }
}

// Helper to return 401 response
export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ success: false, message }, { status: 401 });
}

// Helper to return 403 response
export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ success: false, message }, { status: 403 });
}

// Log an audit action
export async function logAudit(params: {
  actorEmail: string;
  actorRole: string;
  action: string;
  details: string;
  targetId?: string;
}) {
  try {
    const supabase = createServerClient();
    await supabase.from('audit_logs').insert({
      actor_email: params.actorEmail,
      actor_role: params.actorRole,
      action: params.action,
      details: params.details,
      target_id: params.targetId || null,
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }
}
