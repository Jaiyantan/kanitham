import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customer_id');
    const mode = searchParams.get('mode');

    let sql = `
      SELECT 
        p.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.whatsapp_number AS customer_whatsapp
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (customerId) {
      sql += ` AND p.customer_id = $${idx++}`;
      params.push(customerId);
    }
    if (mode && mode !== 'ALL') {
      sql += ` AND p.payment_mode = $${idx++}`;
      params.push(mode);
    }

    sql += ` ORDER BY p.payment_date DESC, p.created_at DESC`;

    const paymentsRes = await query(sql, params);
    const followupRes = await query(`SELECT * FROM v_payment_followup`);
    const outstandingRes = await query(`SELECT * FROM v_customer_outstanding WHERE outstanding_amount > 0 ORDER BY outstanding_amount DESC`);

    return NextResponse.json({
      payments: paymentsRes.rows,
      followup: followupRes.rows,
      outstanding: outstandingRes.rows,
    });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer_id,
      amount,
      payment_date = new Date().toISOString().split('T')[0],
      payment_mode,
      reference_number,
      bank_name,
      is_historical = false,
      notes,
    } = body;

    if (!customer_id || !amount || !payment_mode) {
      return NextResponse.json(
        { error: 'Customer, amount, and payment mode are required' },
        { status: 400 }
      );
    }

    const res = await query(
      `
      INSERT INTO payments (
        customer_id, amount, payment_date, payment_mode,
        reference_number, bank_name, is_historical, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
      `,
      [
        customer_id,
        amount,
        payment_date,
        payment_mode,
        reference_number || null,
        bank_name || null,
        is_historical,
        notes || null,
      ]
    );

    const payment = res.rows[0];

    // Customer name for log
    const cRes = await query(`SELECT name FROM customers WHERE id = $1`, [customer_id]);
    const customerName = cRes.rows[0]?.name || 'Customer';

    await query(
      `INSERT INTO activity_log (entity_type, entity_id, action, description, new_data) VALUES ($1, $2, $3, $4, $5)`,
      [
        'payment',
        payment.id,
        'created',
        `Recorded payment of ₹${Number(amount).toLocaleString('en-IN')} from ${customerName} via ${payment_mode}`,
        JSON.stringify(payment),
      ]
    );

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

