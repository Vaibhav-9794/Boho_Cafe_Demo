import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkStaffAuth, unauthorized, forbidden, logAudit } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET — List notes for a specific customer (Owner & Manager)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request, ['OWNER', 'MANAGER']);
  if (!auth.authenticated) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'email query parameter is required.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: notes, error } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('customer_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CustomerNotes GET] DB error:', error.message);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch customer notes.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, notes });
  } catch (err) {
    console.error('[CustomerNotes GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Add a note for a customer (Owner & Manager)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const auth = await checkStaffAuth(request, ['OWNER', 'MANAGER']);
  if (!auth.authenticated) return unauthorized();

  try {
    const { customerEmail, note, isVipFlag } = (await request.json()) as {
      customerEmail?: string;
      note?: string;
      isVipFlag?: boolean;
    };

    if (!customerEmail || !note) {
      return NextResponse.json(
        { success: false, message: 'customerEmail and note are required.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: createdNote, error } = await supabase
      .from('customer_notes')
      .insert({
        customer_email: customerEmail.trim().toLowerCase(),
        note,
        is_vip_flag: isVipFlag ?? false,
        staff_name: auth.name,
        staff_role: auth.role,
      })
      .select()
      .single();

    if (error) {
      console.error('[CustomerNotes POST] Insert error:', error.message);
      return NextResponse.json(
        { success: false, message: 'Failed to add note.' },
        { status: 500 }
      );
    }

    await logAudit({
      actorEmail: auth.email || '',
      actorRole: auth.role || '',
      action: 'CUSTOMER_NOTE_ADDED',
      details: `Added note for ${customerEmail}${isVipFlag ? ' (VIP flag)' : ''}`,
      targetId: createdNote.id,
    });

    return NextResponse.json({ success: true, note: createdNote }, { status: 201 });
  } catch (err) {
    console.error('[CustomerNotes POST] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — Delete a customer note (Owner only)
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

    const { error } = await supabase
      .from('customer_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[CustomerNotes DELETE] DB error:', error.message);
      return NextResponse.json(
        { success: false, message: 'Failed to delete note.' },
        { status: 500 }
      );
    }

    await logAudit({
      actorEmail: auth.email || '',
      actorRole: 'OWNER',
      action: 'CUSTOMER_NOTE_DELETED',
      details: `Deleted customer note id: ${id}`,
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[CustomerNotes DELETE] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
