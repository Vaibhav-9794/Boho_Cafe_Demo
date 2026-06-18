import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkStaffAuth, unauthorized, logAudit } from '@/lib/auth';

// Allowed tables for backup export
const ALLOWED_TABLES = [
  'reservations',
  'menu_items',
  'staff_profiles',
  'waitlist',
  'customer_notes',
  'audit_logs',
  'blocked_dates',
  'newsletter_subscribers',
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

function isAllowedTable(name: string): name is AllowedTable {
  return ALLOWED_TABLES.includes(name as AllowedTable);
}

// Convert array of objects to CSV string
function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        const str = value === null || value === undefined ? '' : String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// GET  — Generate data backup (Owner only)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request, ['OWNER']);
  if (!auth.authenticated) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const tablesParam = searchParams.get('tables') || ALLOWED_TABLES.join(',');
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';

    // Parse and validate requested tables
    const requestedTables = tablesParam
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const invalidTables = requestedTables.filter((t) => !isAllowedTable(t));
    if (invalidTables.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid table names: ${invalidTables.join(', ')}. Allowed: ${ALLOWED_TABLES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (requestedTables.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one table must be specified.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const backupData: Record<string, unknown[]> = {};

    for (const tableName of requestedTables) {
      const { data, error } = await supabase.from(tableName).select('*');

      if (error) {
        console.error(`[Backup] Error fetching ${tableName}:`, error.message);
        backupData[tableName] = [];
      } else {
        backupData[tableName] = data || [];
      }
    }

    // Audit log
    await logAudit({
      actorEmail: auth.email || '',
      actorRole: 'OWNER',
      action: 'DATA_BACKUP',
      details: `Backup exported: ${requestedTables.join(', ')} (format: ${format})`,
    });

    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(Date.now() + istOffset);
    const timestamp = nowIST.toISOString().replace(/[:.]/g, '-').split('T').join('_').slice(0, 19);

    if (format === 'json') {
      const jsonStr = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          tables: requestedTables,
          data: backupData,
        },
        null,
        2
      );

      return new NextResponse(jsonStr, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="boho-backup_${timestamp}.json"`,
        },
      });
    }

    // CSV format: combine all tables with a table header separator
    const csvParts: string[] = [];

    for (const tableName of requestedTables) {
      const tableData = backupData[tableName] as Record<string, unknown>[];
      if (tableData.length > 0) {
        csvParts.push(`--- ${tableName.toUpperCase()} ---`);
        csvParts.push(toCSV(tableData));
        csvParts.push(''); // blank line separator
      } else {
        csvParts.push(`--- ${tableName.toUpperCase()} ---`);
        csvParts.push('(no data)');
        csvParts.push('');
      }
    }

    const csvStr = csvParts.join('\n');

    return new NextResponse(csvStr, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="boho-backup_${timestamp}.csv"`,
      },
    });
  } catch (err) {
    console.error('[Backup] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
