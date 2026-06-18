import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkStaffAuth, unauthorized, forbidden, logAudit } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET — List audit logs with optional filters (Owner only)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request, ['OWNER']);
  if (!auth.authenticated) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action')?.trim();
    const actor = searchParams.get('actor')?.trim().toLowerCase();
    const from = searchParams.get('from')?.trim(); // YYYY-MM-DD
    const to = searchParams.get('to')?.trim(); // YYYY-MM-DD
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1),
      200
    );

    const supabase = createServerClient();

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply optional filters
    if (action) {
      query = query.eq('action', action);
    }

    if (actor) {
      query = query.ilike('actor_email', `%${actor}%`);
    }

    if (from) {
      // From the start of the given day
      query = query.gte('created_at', `${from}T00:00:00.000Z`);
    }

    if (to) {
      // Through the end of the given day
      query = query.lte('created_at', `${to}T23:59:59.999Z`);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('[Audit GET] DB error:', error.message);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch audit logs.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, logs });
  } catch (err) {
    console.error('[Audit GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
