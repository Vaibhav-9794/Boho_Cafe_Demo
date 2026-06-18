import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { checkStaffAuth, unauthorized, forbidden, logAudit } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Helper: create an admin Supabase client with service-role key
// (needed for auth.admin operations like createUser, updateUserById, signOut)
// ---------------------------------------------------------------------------
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ---------------------------------------------------------------------------
// GET  — List all staff profiles (Owner only)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request, ['OWNER']);
  if (!auth.authenticated) return unauthorized();

  try {
    const supabase = createServerClient();

    const { data: staff, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Staff GET] DB error:', error.message);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch staff profiles.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, staff });
  } catch (err) {
    console.error('[Staff GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Create a new manager account (Owner only)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const auth = await checkStaffAuth(request, ['OWNER']);
  if (!auth.authenticated) return unauthorized();

  try {
    const { name, email, password } = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    // 1. Create Supabase Auth user via admin API
    const adminClient = createAdminClient();
    const { data: newUserData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !newUserData?.user) {
      console.error('[Staff POST] Auth createUser error:', authError?.message);
      return NextResponse.json(
        {
          success: false,
          message: authError?.message || 'Failed to create auth user.',
        },
        { status: 400 }
      );
    }

    const newUser = newUserData.user;

    // 2. Insert staff profile
    const supabase = createServerClient();
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .insert({
        user_id: newUser.id,
        name,
        email,
        role: 'MANAGER',
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (profileError) {
      console.error('[Staff POST] Profile insert error:', profileError.message);
      // Attempt to clean up the orphaned auth user
      await adminClient.auth.admin.deleteUser(newUser.id);
      return NextResponse.json(
        { success: false, message: 'Failed to create staff profile.' },
        { status: 500 }
      );
    }

    // 3. Audit log
    await logAudit({
      actorEmail: auth.email || '',
      actorRole: 'OWNER',
      action: 'MANAGER_CREATED',
      details: `Created manager: ${name} (${email})`,
      targetId: newUser.id,
    });

    return NextResponse.json({ success: true, profile }, { status: 201 });
  } catch (err) {
    console.error('[Staff POST] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update a manager (name, status, password reset) (Owner only)
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  const auth = await checkStaffAuth(request, ['OWNER']);
  if (!auth.authenticated) return unauthorized();

  try {
    const body = (await request.json()) as {
      id?: string;
      action?: string;
      name?: string;
      newPassword?: string;
    };

    const { id, action: patchAction } = body;

    if (!id || !patchAction) {
      return NextResponse.json(
        { success: false, message: 'id and action are required.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch the existing profile to get user_id
    const { data: profile, error: fetchError } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json(
        { success: false, message: 'Staff profile not found.' },
        { status: 404 }
      );
    }

    const adminClient = createAdminClient();

    switch (patchAction) {
      // ── Update name ──────────────────────────────────────────────────
      case 'update_name': {
        const { name } = body;
        if (!name) {
          return NextResponse.json(
            { success: false, message: 'name is required for update_name.' },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from('staff_profiles')
          .update({ name })
          .eq('id', id);

        if (error) {
          console.error('[Staff PATCH] update_name error:', error.message);
          return NextResponse.json(
            { success: false, message: 'Failed to update name.' },
            { status: 500 }
          );
        }

        await logAudit({
          actorEmail: auth.email || '',
          actorRole: 'OWNER',
          action: 'MANAGER_NAME_UPDATED',
          details: `Updated name for ${profile.email} to "${name}"`,
          targetId: profile.user_id,
        });
        break;
      }

      // ── Suspend ──────────────────────────────────────────────────────
      case 'suspend': {
        const { error } = await supabase
          .from('staff_profiles')
          .update({ status: 'SUSPENDED' })
          .eq('id', id);

        if (error) {
          console.error('[Staff PATCH] suspend error:', error.message);
          return NextResponse.json(
            { success: false, message: 'Failed to suspend manager.' },
            { status: 500 }
          );
        }

        // Force sign out from all sessions
        await adminClient.auth.admin.signOut(profile.user_id, 'global');

        await logAudit({
          actorEmail: auth.email || '',
          actorRole: 'OWNER',
          action: 'MANAGER_SUSPENDED',
          details: `Suspended manager: ${profile.name} (${profile.email})`,
          targetId: profile.user_id,
        });
        break;
      }

      // ── Deactivate ───────────────────────────────────────────────────
      case 'deactivate': {
        const { error } = await supabase
          .from('staff_profiles')
          .update({ status: 'INACTIVE' })
          .eq('id', id);

        if (error) {
          console.error('[Staff PATCH] deactivate error:', error.message);
          return NextResponse.json(
            { success: false, message: 'Failed to deactivate manager.' },
            { status: 500 }
          );
        }

        await logAudit({
          actorEmail: auth.email || '',
          actorRole: 'OWNER',
          action: 'MANAGER_DEACTIVATED',
          details: `Deactivated manager: ${profile.name} (${profile.email})`,
          targetId: profile.user_id,
        });
        break;
      }

      // ── Activate ─────────────────────────────────────────────────────
      case 'activate': {
        const { error } = await supabase
          .from('staff_profiles')
          .update({ status: 'ACTIVE' })
          .eq('id', id);

        if (error) {
          console.error('[Staff PATCH] activate error:', error.message);
          return NextResponse.json(
            { success: false, message: 'Failed to activate manager.' },
            { status: 500 }
          );
        }

        await logAudit({
          actorEmail: auth.email || '',
          actorRole: 'OWNER',
          action: 'MANAGER_ACTIVATED',
          details: `Activated manager: ${profile.name} (${profile.email})`,
          targetId: profile.user_id,
        });
        break;
      }

      // ── Reset password ───────────────────────────────────────────────
      case 'reset_password': {
        const { newPassword } = body;
        if (!newPassword) {
          return NextResponse.json(
            { success: false, message: 'newPassword is required for reset_password.' },
            { status: 400 }
          );
        }

        const { error } = await adminClient.auth.admin.updateUserById(
          profile.user_id,
          { password: newPassword }
        );

        if (error) {
          console.error('[Staff PATCH] reset_password error:', error.message);
          return NextResponse.json(
            { success: false, message: 'Failed to reset password.' },
            { status: 500 }
          );
        }

        await logAudit({
          actorEmail: auth.email || '',
          actorRole: 'OWNER',
          action: 'MANAGER_PASSWORD_RESET',
          details: `Password reset for manager: ${profile.name} (${profile.email})`,
          targetId: profile.user_id,
        });
        break;
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${patchAction}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Staff PATCH] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — Soft-delete a manager (set status to INACTIVE) (Owner only)
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

    // Fetch profile for audit log context
    const { data: profile, error: fetchError } = await supabase
      .from('staff_profiles')
      .select('name, email, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json(
        { success: false, message: 'Staff profile not found.' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('staff_profiles')
      .update({ status: 'INACTIVE' })
      .eq('id', id);

    if (error) {
      console.error('[Staff DELETE] Update error:', error.message);
      return NextResponse.json(
        { success: false, message: 'Failed to deactivate staff profile.' },
        { status: 500 }
      );
    }

    await logAudit({
      actorEmail: auth.email || '',
      actorRole: 'OWNER',
      action: 'MANAGER_DELETED',
      details: `Soft-deleted manager: ${profile.name} (${profile.email})`,
      targetId: profile.user_id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Staff DELETE] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
