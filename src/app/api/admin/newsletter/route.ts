import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkStaffAuth, unauthorized, logAudit } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET  — List newsletter subscribers with search & pagination (Owner only)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request, ['OWNER']);
  if (!auth.authenticated) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const supabase = createServerClient();

    // Build query
    let query = supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search.trim()) {
      query = query.ilike('email', `%${search.trim()}%`);
    }

    const { data: subscribers, count: total, error } = await query;

    if (error) {
      console.error('[Newsletter GET] DB error:', error.message);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch subscribers.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscribers: subscribers || [],
      total: total || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[Newsletter GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — Soft unsubscribe a subscriber (Owner only)
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const auth = await checkStaffAuth(request, ['OWNER']);
  if (!auth.authenticated) return unauthorized();

  try {
    const { id } = (await request.json()) as { id?: string };

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'id is required.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch subscriber for audit context
    const { data: subscriber, error: fetchError } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError || !subscriber) {
      return NextResponse.json(
        { success: false, message: 'Subscriber not found.' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ status: 'UNSUBSCRIBED' })
      .eq('id', id);

    if (error) {
      console.error('[Newsletter DELETE] Update error:', error.message);
      return NextResponse.json(
        { success: false, message: 'Failed to unsubscribe.' },
        { status: 500 }
      );
    }

    await logAudit({
      actorEmail: auth.email || '',
      actorRole: 'OWNER',
      action: 'NEWSLETTER_UNSUBSCRIBED',
      details: `Unsubscribed: ${subscriber.email}`,
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Newsletter DELETE] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
