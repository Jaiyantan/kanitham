import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);
    const entityType = searchParams.get('entity_type');

    let sql = `SELECT * FROM activity_log WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (entityType && entityType !== 'ALL') {
      sql += ` AND entity_type = $${idx++}`;
      params.push(entityType);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${idx}`;
    params.push(limit);

    const res = await query(sql, params);
    return NextResponse.json({ activity: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

