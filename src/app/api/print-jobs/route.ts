import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const printerId = searchParams.get('printer_id');
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        pj.*,
        pr.name AS printer_name,
        pr.phone AS printer_phone,
        o.order_number,
        c.name AS customer_name,
        p.name AS product_name
      FROM print_jobs pj
      LEFT JOIN printers pr ON pr.id = pj.printer_id
      JOIN orders o ON o.id = pj.order_id
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN products p ON p.id = o.product_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (printerId) {
      sql += ` AND pj.printer_id = $${idx++}`;
      params.push(printerId);
    }
    if (status && status !== 'ALL') {
      sql += ` AND pj.status = $${idx++}`;
      params.push(status);
    }

    sql += ` ORDER BY pj.created_at DESC`;

    const res = await query(sql, params);
    return NextResponse.json({ print_jobs: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      order_id,
      printer_id,
      design_id,
      material_type,
      width_mm,
      height_mm,
      color_count,
      quantity,
      quantity_unit = 'kg',
      sent_date = new Date().toISOString().split('T')[0],
      expected_dispatch_date,
      cost_per_unit,
      total_cost,
      notes,
    } = body;

    if (!order_id || !printer_id || !quantity) {
      return NextResponse.json(
        { error: 'Order ID, Printer ID, and Quantity are required' },
        { status: 400 }
      );
    }

    const computedTotalCost = total_cost ?? (cost_per_unit ? Number(cost_per_unit) * Number(quantity) : null);

    const result = await transaction(async (client) => {
      const pjRes = await client.query(
        `
        INSERT INTO print_jobs (
          order_id, printer_id, design_id, material_type, width_mm, height_mm,
          color_count, quantity, quantity_unit, sent_date, expected_dispatch_date,
          cost_per_unit, total_cost, status, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ORDER_PLACED', $14)
        RETURNING *;
        `,
        [
          order_id,
          printer_id,
          design_id || null,
          material_type || null,
          width_mm || null,
          height_mm || null,
          color_count || null,
          quantity,
          quantity_unit,
          sent_date,
          expected_dispatch_date || null,
          cost_per_unit || null,
          computedTotalCost,
          notes || null,
        ]
      );
      const printJob = pjRes.rows[0];

      // Advance order status to SENT_TO_PRINT
      await client.query(
        `UPDATE orders SET status = 'SENT_TO_PRINT' WHERE id = $1 AND status IN ('ORDER_RECEIVED', 'DESIGN_APPROVED')`,
        [order_id]
      );

      return printJob;
    });

    return NextResponse.json({ print_job: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

