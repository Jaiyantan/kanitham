import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const pipelineRes = await query(`
      SELECT 
        d.*,
        o.order_number,
        c.name AS customer_name,
        p.name AS product_name,
        EXTRACT(DAY FROM now() - d.created_at)::int AS days_since_created,
        CASE
          WHEN d.status = 'REVISION_REQUIRED' THEN 'ACTION_NEEDED'
          WHEN d.status IN ('PENDING', 'IN_PROGRESS') AND EXTRACT(DAY FROM now() - d.created_at) > 5 THEN 'SLOW'
          ELSE 'ON_TRACK'
        END AS pipeline_status
      FROM designs d
      JOIN orders o ON o.id = d.order_id
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN products p ON p.id = o.product_id
      ORDER BY d.created_at DESC;
    `);

    return NextResponse.json({ designs: pipelineRes.rows });
  } catch (error: any) {
    console.error('Error fetching designs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, file_url, file_name, customer_feedback, internal_notes } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get latest version number
    const vRes = await query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM designs WHERE order_id = $1`,
      [order_id]
    );
    const nextVersion = vRes.rows[0].next_version;

    const res = await query(
      `
      INSERT INTO designs (
        order_id, version_number, status, file_url, file_name,
        customer_feedback, internal_notes, sent_for_approval_at
      )
      VALUES ($1, $2, 'IN_PROGRESS', $3, $4, $5, $6, now())
      RETURNING *;
      `,
      [
        order_id,
        nextVersion,
        file_url || null,
        file_name || `design_v${nextVersion}.pdf`,
        customer_feedback || null,
        internal_notes || null,
      ]
    );

    // Update order status to DESIGN_IN_PROGRESS
    await query(
      `UPDATE orders SET status = 'DESIGN_IN_PROGRESS' WHERE id = $1 AND status = 'DESIGN_PENDING'`,
      [order_id]
    );

    return NextResponse.json({ design: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

