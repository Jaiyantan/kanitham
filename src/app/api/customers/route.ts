import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyType = searchParams.get('type');
    const search = searchParams.get('search');

    let sql = `
      SELECT 
        c.*,
        COALESCE(co.outstanding_amount, c.opening_balance_amount, 0) AS outstanding_amount,
        COALESCE(co.total_invoiced, 0) AS total_invoiced,
        COALESCE(co.total_paid, 0) AS total_paid,
        co.last_payment_date,
        co.days_since_last_payment,
        COALESCE(co.active_orders, 0) AS active_orders
      FROM customers c
      LEFT JOIN v_customer_outstanding co ON co.customer_id = c.id
      WHERE c.deleted_at IS NULL AND c.is_active = true
    `;

    const params: any[] = [];
    let idx = 1;

    if (companyType && companyType !== 'ALL') {
      sql += ` AND c.company_type = $${idx++}`;
      params.push(companyType);
    }

    if (search) {
      sql += ` AND (c.name ILIKE $${idx} OR c.contact_person ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.gstn ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ` ORDER BY c.name ASC`;

    const result = await query(sql, params);
    return NextResponse.json({ customers: result.rows });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      company_type = 'OTHER',
      gstn,
      contact_person,
      phone,
      phone_secondary,
      email,
      whatsapp_number,
      address_line1,
      address_line2,
      city = 'Chennai',
      state = 'Tamil Nadu',
      pincode,
      opening_balance_amount = 0,
      opening_balance_date,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const insertRes = await query(
      `
      INSERT INTO customers (
        name, company_type, gstn, contact_person, phone, phone_secondary,
        email, whatsapp_number, address_line1, address_line2, city, state,
        pincode, opening_balance_amount, opening_balance_date, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
      `,
      [
        name,
        company_type,
        gstn || null,
        contact_person || null,
        phone || null,
        phone_secondary || null,
        email || null,
        whatsapp_number || phone || null,
        address_line1 || null,
        address_line2 || null,
        city,
        state,
        pincode || null,
        opening_balance_amount || 0,
        opening_balance_date || null,
        notes || null,
      ]
    );

    const newCustomer = insertRes.rows[0];

    await query(
      `INSERT INTO activity_log (entity_type, entity_id, action, description) VALUES ($1, $2, $3, $4)`,
      ['customer', newCustomer.id, 'created', `Added new customer ${name}`]
    );

    return NextResponse.json({ customer: newCustomer }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

