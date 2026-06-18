import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkStaffAuth, unauthorized } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET  — Quick stats for the owner dashboard
// Auth: any active staff member
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request);
  if (!auth.authenticated) return unauthorized();

  try {
    const supabase = createServerClient();

    // IST timezone offset
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(Date.now() + istOffset);
    const todayStr = nowIST.toISOString().split('T')[0];

    // 1. Today's reservations count
    const { count: todayReservations, error: todayErr } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('date', todayStr);

    if (todayErr) {
      console.error('[DashboardStats] todayReservations error:', todayErr.message);
    }

    // 2. Pending approvals count
    const { count: pendingApprovals, error: pendingErr } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    if (pendingErr) {
      console.error('[DashboardStats] pendingApprovals error:', pendingErr.message);
    }

    // 3. Tables occupied today (CONFIRMED or ARRIVED)
    const { count: tablesOccupied, error: tablesErr } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('date', todayStr)
      .in('status', ['CONFIRMED', 'ARRIVED']);

    if (tablesErr) {
      console.error('[DashboardStats] tablesOccupied error:', tablesErr.message);
    }

    // 4. VIP count (distinct customer_email with is_vip_flag = true)
    const { data: vipData, error: vipErr } = await supabase
      .from('customer_notes')
      .select('customer_email')
      .eq('is_vip_flag', true);

    if (vipErr) {
      console.error('[DashboardStats] vipCount error:', vipErr.message);
    }

    const vipCount = vipData
      ? new Set(vipData.map((row) => row.customer_email.toLowerCase())).size
      : 0;

    // 5. Waitlist count (today and future)
    const { count: waitlistCount, error: waitlistErr } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .gte('date', todayStr);

    if (waitlistErr) {
      console.error('[DashboardStats] waitlistCount error:', waitlistErr.message);
    }

    return NextResponse.json({
      success: true,
      stats: {
        todayReservations: todayReservations || 0,
        pendingApprovals: pendingApprovals || 0,
        tablesOccupied: tablesOccupied || 0,
        vipCount,
        waitlistCount: waitlistCount || 0,
      },
    });
  } catch (err) {
    console.error('[DashboardStats] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
