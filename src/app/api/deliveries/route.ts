import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');
    const customerId = searchParams.get('customer_id');

    let sql = `
      SELECT 
        d.*,
        o.order_number,
        c.name AS customer_name,
        p.name AS product_name
      FROM deliveries d
      JOIN orders o ON o.id = d.order_id
      JOIN customers c ON c.id = d.customer_id
      LEFT JOIN products p ON p.id = o.product_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (orderId) {
      sql += ` AND d.order_id = $${idx++}`;
      params.push(orderId);
    }
    if (customerId) {
      sql += ` AND d.customer_id = $${idx++}`;
      params.push(customerId);
    }

    sql += ` ORDER BY d.challan_number DESC`;

    const res = await query(sql, params);
    return NextResponse.json({ deliveries: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      order_id,
      customer_id,
      delivery_date = new Date().toISOString().split('T')[0],
      delivery_mode,
      vehicle_number,
      received_by,
      notes,
      batch_allocations = [], // Array of { batch_id: string, quantity: number }
      is_historical = false,
    } = body;

    if (!order_id || !customer_id || batch_allocations.length === 0) {
      return NextResponse.json(
        { error: 'Order, customer, and at least one batch allocation are required' },
        { status: 400 }
      );
    }

    const totalDelivered = batch_allocations.reduce(
      (sum: number, b: any) => sum + Number(b.quantity),
      0
    );

    const result = await transaction(async (client) => {
      // 1. Verify batch stock
      for (const alloc of batch_allocations) {
        const bRes = await client.query(
          `SELECT quantity_remaining FROM godown_batches WHERE id = $1 FOR UPDATE`,
          [alloc.batch_id]
        );
        if (bRes.rows.length === 0) {
          throw new Error(`Godown batch ${alloc.batch_id} not found`);
        }
        const remaining = Number(bRes.rows[0].quantity_remaining);
        if (remaining < Number(alloc.quantity)) {
          throw new Error(
            `Insufficient stock in batch. Available: ${remaining}, Requested: ${alloc.quantity}`
          );
        }
      }

      // 2. Fetch order to determine delivery type
      const oRes = await client.query(
        `SELECT quantity_ordered, quantity_unit FROM orders WHERE id = $1 FOR UPDATE`,
        [order_id]
      );
      if (oRes.rows.length === 0) {
        throw new Error('Order not found');
      }
      const order = oRes.rows[0];

      // Past deliveries total
      const prevDelRes = await client.query(
        `SELECT COALESCE(SUM(quantity_delivered), 0) AS total_past FROM deliveries WHERE order_id = $1`,
        [order_id]
      );
      const totalPast = Number(prevDelRes.rows[0].total_past);
      const cumulativeDelivered = totalPast + totalDelivered;
      const deliveryType =
        cumulativeDelivered >= Number(order.quantity_ordered) ? 'FULL' : 'PARTIAL';

      // 3. Create delivery record
      const delRes = await client.query(
        `
        INSERT INTO deliveries (
          order_id, customer_id, delivery_date, delivery_type,
          quantity_delivered, quantity_unit, delivery_mode, vehicle_number,
          received_by, is_historical, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
        `,
        [
          order_id,
          customer_id,
          delivery_date,
          deliveryType,
          totalDelivered,
          order.quantity_unit || 'kg',
          delivery_mode || null,
          vehicle_number || null,
          received_by || null,
          is_historical,
          notes || null,
        ]
      );
      const delivery = delRes.rows[0];

      // 4. Create delivery items and decrement godown batch stock
      for (const alloc of batch_allocations) {
        await client.query(
          `
          INSERT INTO delivery_items (delivery_id, godown_batch_id, quantity)
          VALUES ($1, $2, $3);
          `,
          [delivery.id, alloc.batch_id, alloc.quantity]
        );

        await client.query(
          `
          UPDATE godown_batches
          SET quantity_remaining = quantity_remaining - $1
          WHERE id = $2;
          `,
          [alloc.quantity, alloc.batch_id]
        );
      }

      // 5. Update order status
      const nextStatus =
        cumulativeDelivered >= Number(order.quantity_ordered)
          ? 'FULLY_DELIVERED'
          : 'PARTIALLY_DELIVERED';

      await client.query(
        `UPDATE orders SET status = $1 WHERE id = $2`,
        [nextStatus, order_id]
      );

      // 6. Log activity
      await client.query(
        `INSERT INTO activity_log (entity_type, entity_id, action, description) VALUES ($1, $2, $3, $4)`,
        [
          'delivery',
          delivery.id,
          'created',
          `Generated Challan #${delivery.challan_number} for ${totalDelivered} ${order.quantity_unit} (${deliveryType} delivery)`,
        ]
      );

      return delivery;
    });

    return NextResponse.json({ delivery: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating delivery:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

