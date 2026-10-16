import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. Order details
    const orderRes = await query(
      `
      SELECT 
        o.*,
        c.name AS customer_name,
        c.company_type AS customer_company_type,
        c.phone AS customer_phone,
        c.whatsapp_number AS customer_whatsapp,
        p.name AS product_name,
        p.sku_code AS product_sku,
        p.material_type AS product_material_type,
        p.color_count AS product_color_count,
        EXTRACT(DAY FROM now() - o.status_changed_at)::int AS days_in_current_stage
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN products p ON p.id = o.product_id
      WHERE o.id = $1 AND o.deleted_at IS NULL;
      `,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderRes.rows[0];

    // 2. Status History (timeline)
    const historyRes = await query(
      `
      SELECT * FROM order_status_history 
      WHERE order_id = $1 
      ORDER BY changed_at ASC;
      `,
      [id]
    );

    // 3. Designs
    const designsRes = await query(
      `
      SELECT * FROM designs 
      WHERE order_id = $1 
      ORDER BY version_number ASC;
      `,
      [id]
    );

    // 4. Print Jobs
    const printJobsRes = await query(
      `
      SELECT pj.*, pr.name AS printer_name 
      FROM print_jobs pj
      LEFT JOIN printers pr ON pr.id = pj.printer_id
      WHERE pj.order_id = $1
      ORDER BY pj.created_at ASC;
      `,
      [id]
    );

    // 5. Lorry Manifest Items
    const lorryItemsRes = await query(
      `
      SELECT li.*, l.lr_number, l.transporter_name, l.status AS lorry_status, l.expected_arrival_date
      FROM lorry_items li
      JOIN lorries l ON l.id = li.lorry_id
      WHERE li.order_id = $1
      ORDER BY li.created_at ASC;
      `,
      [id]
    );

    // 6. Godown Batches
    const godownBatchesRes = await query(
      `
      SELECT gb.*, (CURRENT_DATE - gb.received_date) AS days_in_godown
      FROM godown_batches gb
      WHERE gb.order_id = $1
      ORDER BY gb.received_date ASC;
      `,
      [id]
    );

    // 7. Deliveries
    const deliveriesRes = await query(
      `
      SELECT d.*, di.godown_batch_id, di.quantity AS batch_quantity_drawn
      FROM deliveries d
      LEFT JOIN delivery_items di ON di.delivery_id = d.id
      WHERE d.order_id = $1
      ORDER BY d.delivery_date ASC;
      `,
      [id]
    );

    return NextResponse.json({
      order,
      history: historyRes.rows,
      designs: designsRes.rows,
      print_jobs: printJobsRes.rows,
      lorry_items: lorryItemsRes.rows,
      godown_batches: godownBatchesRes.rows,
      deliveries: deliveriesRes.rows,
    });
  } catch (error: any) {
    console.error('Error fetching order detail:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, expected_delivery_date, notes, quantity_ordered, rate_per_unit } = body;

    const currentOrder = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
    if (currentOrder.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
    }
    if (expected_delivery_date !== undefined) {
      updates.push(`expected_delivery_date = $${idx++}`);
      values.push(expected_delivery_date);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      values.push(notes);
    }
    if (quantity_ordered !== undefined) {
      updates.push(`quantity_ordered = $${idx++}`);
      values.push(quantity_ordered);
    }
    if (rate_per_unit !== undefined) {
      updates.push(`rate_per_unit = $${idx++}`);
      values.push(rate_per_unit);
    }

    if (updates.length === 0) {
      return NextResponse.json({ order: currentOrder.rows[0] });
    }

    values.push(id);
    const sql = `
      UPDATE orders
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const updatedRes = await query(sql, values);
    const updatedOrder = updatedRes.rows[0];

    // Log status change if status changed
    if (status && status !== currentOrder.rows[0].status) {
      await query(
        `
        INSERT INTO activity_log (entity_type, entity_id, action, description, old_data, new_data)
        VALUES ($1, $2, $3, $4, $5, $6);
        `,
        [
          'order',
          id,
          'status_changed',
          `Order #${updatedOrder.order_number} status changed to ${status}`,
          JSON.stringify({ status: currentOrder.rows[0].status }),
          JSON.stringify({ status }),
        ]
      );
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await query(`UPDATE orders SET deleted_at = now() WHERE id = $1`, [id]);
    await query(
      `INSERT INTO activity_log (entity_type, entity_id, action, description) VALUES ($1, $2, $3, $4)`,
      ['order', id, 'deleted', `Order ${id} soft deleted`]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

