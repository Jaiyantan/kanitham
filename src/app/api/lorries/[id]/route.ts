import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const lorryRes = await query(
      `SELECT * FROM v_lorry_tracker WHERE lorry_id = $1`,
      [id]
    );

    if (lorryRes.rows.length === 0) {
      return NextResponse.json({ error: 'Lorry not found' }, { status: 404 });
    }

    const itemsRes = await query(
      `
      SELECT 
        li.*,
        o.order_number,
        c.name AS customer_name,
        p.name AS product_name
      FROM lorry_items li
      JOIN orders o ON o.id = li.order_id
      JOIN customers c ON c.id = li.customer_id
      LEFT JOIN products p ON p.id = li.product_id
      WHERE li.lorry_id = $1
      ORDER BY li.created_at ASC;
      `,
      [id]
    );

    return NextResponse.json({
      lorry: lorryRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (error: any) {
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
    const {
      status,
      tempo_booked,
      tempo_cost,
      tempo_vehicle_number,
      tempo_booking_date = new Date().toISOString().split('T')[0],
      actual_arrival_date,
      freight_paid,
      notes,
    } = body;

    const result = await transaction(async (client) => {
      const currentRes = await client.query(`SELECT * FROM lorries WHERE id = $1`, [id]);
      if (currentRes.rows.length === 0) {
        throw new Error('Lorry not found');
      }
      const current = currentRes.rows[0];

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (status !== undefined) {
        updates.push(`status = $${idx++}`);
        values.push(status);
      }
      if (actual_arrival_date !== undefined) {
        updates.push(`actual_arrival_date = $${idx++}`);
        values.push(actual_arrival_date);
      } else if (status === 'ARRIVED_AT_OFFICE' && !current.actual_arrival_date) {
        updates.push(`actual_arrival_date = CURRENT_DATE`);
      }
      if (tempo_booked !== undefined) {
        updates.push(`tempo_booked = $${idx++}`);
        values.push(tempo_booked);
        if (tempo_booked) {
          updates.push(`tempo_booking_date = $${idx++}`);
          values.push(tempo_booking_date);
        }
      }
      if (tempo_cost !== undefined) {
        updates.push(`tempo_cost = $${idx++}`);
        values.push(tempo_cost);
      }
      if (tempo_vehicle_number !== undefined) {
        updates.push(`tempo_vehicle_number = $${idx++}`);
        values.push(tempo_vehicle_number);
      }
      if (freight_paid !== undefined) {
        updates.push(`freight_paid = $${idx++}`);
        values.push(freight_paid);
      }
      if (notes !== undefined) {
        updates.push(`notes = $${idx++}`);
        values.push(notes);
      }

      if (updates.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE lorries SET ${updates.join(', ')} WHERE id = $${idx}`,
          values
        );
      }

      // If arrived at office, update orders
      if (status === 'ARRIVED_AT_OFFICE') {
        await client.query(
          `
          UPDATE orders 
          SET status = 'ARRIVED_AT_LORRY_OFFICE'
          WHERE id IN (SELECT order_id FROM lorry_items WHERE lorry_id = $1)
            AND status = 'IN_TRANSIT';
          `,
          [id]
        );
      }

      // If RECEIVED_IN_GODOWN, create godown batches and update orders
      if (status === 'RECEIVED_IN_GODOWN' && current.status !== 'RECEIVED_IN_GODOWN') {
        const items = await client.query(
          `SELECT * FROM lorry_items WHERE lorry_id = $1`,
          [id]
        );

        for (const item of items.rows) {
          await client.query(
            `
            INSERT INTO godown_batches (
              lorry_id, lorry_item_id, order_id, customer_id, product_id,
              quantity_received, quantity_remaining, quantity_unit, received_date
            )
            VALUES ($1, $2, $3, $4, $5, $6, $6, $7, CURRENT_DATE);
            `,
            [
              id,
              item.id,
              item.order_id,
              item.customer_id,
              item.product_id,
              item.quantity,
              item.quantity_unit || 'kg',
            ]
          );

          await client.query(
            `
            UPDATE orders
            SET status = 'RECEIVED_IN_GODOWN'
            WHERE id = $1 AND status IN ('IN_TRANSIT', 'ARRIVED_AT_LORRY_OFFICE');
            `,
            [item.order_id]
          );
        }

        await client.query(
          `INSERT INTO activity_log (entity_type, entity_id, action, description) VALUES ($1, $2, $3, $4)`,
          [
            'lorry',
            id,
            'received_in_godown',
            `Lorry LR #${current.lr_number} unloaded at godown. Batches created for all manifest items.`,
          ]
        );
      }

      const updated = await client.query(
        `SELECT * FROM v_lorry_tracker WHERE lorry_id = $1`,
        [id]
      );
      return updated.rows[0];
    });

    return NextResponse.json({ lorry: result });
  } catch (error: any) {
    console.error('Error updating lorry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

