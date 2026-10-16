import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agingStatus = searchParams.get('aging_status'); // NORMAL, WARNING, CRITICAL
    const customerId = searchParams.get('customer_id');

    let agingSql = `SELECT * FROM v_godown_aging WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (agingStatus && agingStatus !== 'ALL') {
      agingSql += ` AND aging_status = $${idx++}`;
      params.push(agingStatus);
    }
    if (customerId) {
      agingSql += ` AND customer_id = $${idx++}`;
      params.push(customerId);
    }

    agingSql += ` ORDER BY days_in_godown DESC`;

    const agingRes = await query(agingSql, params);
    const customerSummaryRes = await query(`SELECT * FROM v_godown_by_customer ORDER BY critical_quantity DESC, total_quantity_sitting DESC`);

    // Stock breakdown categories:
    // 1. Allocated, awaiting partial delivery: remaining tied to orders in PARTIALLY_DELIVERED
    // 2. Received, delivery not yet started: remaining tied to orders in RECEIVED_IN_GODOWN
    // 3. Free stock: orders CLOSED or FULLY_DELIVERED
    const categoriesRes = await query(`
      SELECT 
        CASE 
          WHEN o.status = 'PARTIALLY_DELIVERED' THEN 'AWAITING_PARTIAL'
          WHEN o.status = 'RECEIVED_IN_GODOWN' THEN 'NOT_STARTED'
          ELSE 'FREE_STOCK'
        END AS category,
        COALESCE(SUM(gb.quantity_remaining), 0) AS total_kg,
        COUNT(*) AS batch_count
      FROM godown_batches gb
      JOIN orders o ON o.id = gb.order_id
      WHERE gb.quantity_remaining > 0
      GROUP BY category;
    `);

    return NextResponse.json({
      batches: agingRes.rows,
      by_customer: customerSummaryRes.rows,
      categories: categoriesRes.rows,
    });
  } catch (error: any) {
    console.error('Error fetching godown data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

