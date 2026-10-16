import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const search = searchParams.get('search');
    const includeHistorical = searchParams.get('include_historical') === 'true';

    let sql = `
      SELECT 
        o.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.whatsapp_number AS customer_whatsapp,
        p.name AS product_name,
        p.sku_code AS product_sku,
        EXTRACT(DAY FROM now() - o.status_changed_at)::int AS days_in_current_stage,
        CASE 
          WHEN EXTRACT(DAY FROM now() - o.status_changed_at) >= (
            SELECT (value #>> '{}')::int FROM app_settings WHERE key = 'order_stuck_warning_days'
          ) AND o.status NOT IN ('FULLY_DELIVERED', 'CLOSED') THEN true
          ELSE false
        END AS is_stuck
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN products p ON p.id = o.product_id
      WHERE o.deleted_at IS NULL
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (!includeHistorical) {
      sql += ` AND o.is_historical = false`;
    }

    if (status && status !== 'ALL') {
      sql += ` AND o.status = $${paramIndex++}`;
      params.push(status);
    }

    if (customerId) {
      sql += ` AND o.customer_id = $${paramIndex++}`;
      params.push(customerId);
    }

    if (search) {
      sql += ` AND (
        c.name ILIKE $${paramIndex} OR 
        p.name ILIKE $${paramIndex} OR 
        o.order_number::text ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY o.order_number DESC`;

    const result = await query(sql, params);
    return NextResponse.json({ orders: result.rows });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer_id,
      product_id,
      order_date = new Date().toISOString().split('T')[0],
      expected_delivery_date,
      quantity_ordered,
      quantity_unit = 'kg',
      rate_per_unit,
      total_amount,
      status = 'ORDER_RECEIVED',
      is_historical = false,
      notes,
    } = body;

    if (!customer_id || !quantity_ordered || !rate_per_unit) {
      return NextResponse.json(
        { error: 'Customer, quantity, and rate are required' },
        { status: 400 }
      );
    }

    const computedTotal = total_amount ?? Number(quantity_ordered) * Number(rate_per_unit);

    const insertRes = await query(
      `
      INSERT INTO orders (
        customer_id, product_id, order_date, expected_delivery_date,
        quantity_ordered, quantity_unit, rate_per_unit, total_amount,
        status, is_historical, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
      `,
      [
        customer_id,
        product_id || null,
        order_date,
        expected_delivery_date || null,
        quantity_ordered,
        quantity_unit,
        rate_per_unit,
        computedTotal,
        status,
        is_historical,
        notes || null,
      ]
    );

    const newOrder = insertRes.rows[0];

    // Log activity
    await query(
      `
      INSERT INTO activity_log (entity_type, entity_id, action, description, new_data)
      VALUES ($1, $2, $3, $4, $5);
      `,
      [
        'order',
        newOrder.id,
        'created',
        `Created Order #${newOrder.order_number} (${quantity_ordered} ${quantity_unit})`,
        JSON.stringify(newOrder),
      ]
    );

    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

