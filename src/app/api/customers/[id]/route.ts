import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const customerRes = await query(
      `
      SELECT 
        c.*,
        co.outstanding_amount,
        co.total_invoiced,
        co.total_paid,
        co.last_payment_date,
        co.days_since_last_payment,
        co.active_orders
      FROM customers c
      LEFT JOIN v_customer_outstanding co ON co.customer_id = c.id
      WHERE c.id = $1 AND c.deleted_at IS NULL;
      `,
      [id]
    );

    if (customerRes.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = customerRes.rows[0];

    // Products for this customer
    const productsRes = await query(
      `SELECT * FROM products WHERE customer_id = $1 AND is_active = true ORDER BY name ASC`,
      [id]
    );

    // Recent orders
    const ordersRes = await query(
      `
      SELECT o.*, p.name AS product_name 
      FROM orders o
      LEFT JOIN products p ON p.id = o.product_id
      WHERE o.customer_id = $1 AND o.deleted_at IS NULL
      ORDER BY o.order_date DESC
      LIMIT 20;
      `,
      [id]
    );

    // Recent payments
    const paymentsRes = await query(
      `SELECT * FROM payments WHERE customer_id = $1 ORDER BY payment_date DESC LIMIT 20`,
      [id]
    );

    return NextResponse.json({
      customer,
      products: productsRes.rows,
      orders: ordersRes.rows,
      payments: paymentsRes.rows,
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

    const allowedFields = [
      'name', 'company_type', 'gstn', 'contact_person', 'phone', 'phone_secondary',
      'email', 'whatsapp_number', 'address_line1', 'address_line2', 'city', 'state',
      'pincode', 'opening_balance_amount', 'opening_balance_date', 'notes', 'is_active'
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        values.push(body[key]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const sql = `UPDATE customers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *;`;
    const res = await query(sql, values);

    return NextResponse.json({ customer: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

