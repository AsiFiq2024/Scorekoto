import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/audit-logs - Fetch live shadow table audit logs created by triggers
export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Administrator privileges required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const table = searchParams.get('table');

    let query = `
      SELECT 
        log_id,
        table_name,
        operation,
        record_id,
        changed_data,
        TO_CHAR(changed_at, 'YYYY-MM-DD HH24:MI:SS') as changed_at
      FROM audit_log
    `;
    const params = [];

    if (table) {
      query += ` WHERE table_name = $1`;
      params.push(table);
    }

    query += ` ORDER BY log_id DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return NextResponse.json(
      {
        success: true,
        count: result.rows.length,
        logs: result.rows,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
