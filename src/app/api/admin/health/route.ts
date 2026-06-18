import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { checkStaffAuth, unauthorized } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Helper: create an admin Supabase client for auth.admin operations
// ---------------------------------------------------------------------------
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
}

interface TableCount {
  name: string;
  count: number;
}

// ---------------------------------------------------------------------------
// GET  — System health check (Owner only)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request, ['OWNER']);
  if (!auth.authenticated) return unauthorized();

  const services: ServiceStatus[] = [];
  const tables: TableCount[] = [];

  const supabase = createServerClient();

  // ── 1. Database check ──
  try {
    const { error } = await supabase.from('reservations').select('id').limit(1);
    if (error) {
      services.push({ name: 'database', status: 'error', message: `Query failed: ${error.message}` });
    } else {
      services.push({ name: 'database', status: 'healthy', message: 'Connected and responsive' });
    }
  } catch (err) {
    services.push({ name: 'database', status: 'error', message: `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
  }

  // ── 2. Email (Resend) check ──
  if (process.env.RESEND_API_KEY) {
    services.push({ name: 'email', status: 'healthy', message: 'RESEND_API_KEY configured' });
  } else {
    services.push({ name: 'email', status: 'warning', message: 'RESEND_API_KEY not configured' });
  }

  // ── 3. WhatsApp check ──
  if (process.env.WHATSAPP_API_TOKEN) {
    services.push({ name: 'whatsapp', status: 'healthy', message: 'WHATSAPP_API_TOKEN configured' });
  } else {
    services.push({ name: 'whatsapp', status: 'warning', message: 'WHATSAPP_API_TOKEN not configured' });
  }

  // ── 4. Auth check ──
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.listUsers({ perPage: 1 });
    if (error) {
      services.push({ name: 'auth', status: 'error', message: `Auth admin failed: ${error.message}` });
    } else {
      services.push({ name: 'auth', status: 'healthy', message: 'Auth service responsive' });
    }
  } catch (err) {
    services.push({ name: 'auth', status: 'error', message: `Auth check failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
  }

  // ── 5. Environment check ──
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY',
    'NEXT_PUBLIC_SITE_URL',
  ];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length === 0) {
    services.push({ name: 'environment', status: 'healthy', message: 'All required environment variables set' });
  } else {
    services.push({
      name: 'environment',
      status: 'warning',
      message: `Missing: ${missingVars.join(', ')}`,
    });
  }

  // ── Table row counts ──
  const tableNames = [
    'reservations',
    'menu_items',
    'staff_profiles',
    'waitlist',
    'customer_notes',
    'audit_logs',
    'blocked_dates',
  ];

  for (const tableName of tableNames) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`[Health] Table count error for ${tableName}:`, error.message);
        tables.push({ name: tableName, count: -1 });
      } else {
        tables.push({ name: tableName, count: count || 0 });
      }
    } catch {
      tables.push({ name: tableName, count: -1 });
    }
  }

  return NextResponse.json({
    success: true,
    services,
    tables,
    timestamp: new Date().toISOString(),
  });
}
