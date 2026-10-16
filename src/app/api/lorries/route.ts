import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // ON_TRACK, OVERDUE, NEEDS_TEMPO, COMPLETED

    let sql = `SELECT * FROM v_lorry_tracker`;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      sql += ` WHERE tracking_status = $1`;
      params.push(status);
    }

    sql += ` ORDER BY 
      CASE tracking_status 
        WHEN 'OVERDUE' THEN 1 
        WHEN 'NEEDS_TEMPO' THEN 2 
        WHEN 'ARRIVING_TODAY' THEN 3 
        WHEN 'ON_TRACK' THEN 4 
        ELSE 5 
      END,
      days_overdue DESC,
      expected_arrival_date ASC`;

    const res = await query(sql, params);
    return NextResponse.json({ lorries: res.rows });
  } catch (error: any) {
    console.error('Error fetching lorries:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lr_number,
      booking_date,
      transporter_name,
      transporter_phone,
      driver_name,
      driver_phone,
      vehicle_number,
      origin_city = 'Delhi',
      destination_city = 'Chennai',
      dispatch_date,
      expected_arrival_date,
      lorry_office_name,
      lorry_office_address,
      lorry_office_phone,
      freight_cost,
      freight_paid = false,
      notes,
      items = [], // Array of { order_id, customer_id, product_id, quantity, quantity_unit, weight_kg }
    } = body;

    if (!lr_number || !transporter_name) {
      return NextResponse.json(
        { error: 'LR number and transporter name are required' },
        { status: 400 }
      );
    }

    const newLorry = await transaction(async (client) => {
      // 1. Insert lorry
      const lRes = await client.query(
        `
        INSERT INTO lorries (
          lr_number, booking_date, transporter_name, transporter_phone,
          driver_name, driver_phone, vehicle_number, origin_city, destination_city,
          dispatch_date, expected_arrival_date, lorry_office_name,
          lorry_office_address, lorry_office_phone, freight_cost, freight_paid,
          status, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'IN_TRANSIT', $17)
        RETURNING *;
        `,
        [
          lr_number,
          booking_date || null,
          transporter_name,
          transporter_phone || null,
          driver_name || null,
          driver_phone || null,
          vehicle_number || null,
          origin_city,
          destination_city,
          dispatch_date || null,
          expected_arrival_date || null,
          lorry_office_name || null,
          lorry_office_address || null,
          lorry_office_phone || null,
          freight_cost || null,
          freight_paid,
          notes || null,
        ]
      );
      const lorry = lRes.rows[0];

      // 2. Insert manifest items and update orders to IN_TRANSIT
      for (const item of items) {
        await client.query(
          `
          INSERT INTO lorry_items (
            lorry_id, order_id, customer_id, product_id, quantity, quantity_unit, weight_kg
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7);
          `,
          [
            lorry.id,
            item.order_id,
            item.customer_id,
            item.product_id || null,
            item.quantity,
            item.quantity_unit || 'kg',
            item.weight_kg || item.quantity,
          ]
        );

        // Update order status to IN_TRANSIT if not already past it
        await client.query(
          `UPDATE orders SET status = 'IN_TRANSIT' WHERE id = $1 AND status IN ('ORDER_RECEIVED', 'SENT_TO_PRINT', 'PRINTING', 'PRINT_DISPATCHED')`,
          [item.order_id]
        );
      }

      // Log activity
      await client.query(
        `INSERT INTO activity_log (entity_type, entity_id, action, description) VALUES ($1, $2, $3, $4)`,
        ['lorry', lorry.id, 'created', `Dispatched Lorry LR #${lr_number} from Delhi to Chennai with ${items.length} items`]
      );

      return lorry;
    });

    return NextResponse.json({ lorry: newLorry }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lorry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

