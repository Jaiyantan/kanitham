import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await query(
      `
      SELECT 
        pr.*,
        COUNT(pj.id) FILTER (WHERE pj.status IN ('ORDER_PLACED', 'IN_PRODUCTION')) AS active_jobs_count
      FROM printers pr
      LEFT JOIN print_jobs pj ON pj.printer_id = pr.id
      WHERE pr.is_active = true
      GROUP BY pr.id
      ORDER BY pr.name ASC;
      `
    );
    return NextResponse.json({ printers: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, contact_person, phone, email, address, city = 'Delhi' } = body;

    if (!name) {
      return NextResponse.json({ error: 'Printer name is required' }, { status: 400 });
    }

    const res = await query(
      `
      INSERT INTO printers (name, contact_person, phone, email, address, city)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
      `,
      [name, contact_person || null, phone || null, email || null, address || null, city]
    );

    return NextResponse.json({ printer: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

