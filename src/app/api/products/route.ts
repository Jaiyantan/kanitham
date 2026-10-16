import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customer_id');

    let sql = `
      SELECT p.*, c.name AS customer_name
      FROM products p
      JOIN customers c ON c.id = p.customer_id
      WHERE p.is_active = true
    `;
    const params: any[] = [];

    if (customerId) {
      sql += ` AND p.customer_id = $1`;
      params.push(customerId);
    }

    sql += ` ORDER BY p.name ASC`;
    const res = await query(sql, params);
    return NextResponse.json({ products: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer_id,
      sku_code,
      name,
      description,
      material_type,
      width_mm,
      height_mm,
      thickness_micron,
      color_count,
      default_rate,
      rate_unit = 'per_kg',
    } = body;

    if (!customer_id || !name) {
      return NextResponse.json(
        { error: 'Customer ID and Product Name are required' },
        { status: 400 }
      );
    }

    const res = await query(
      `
      INSERT INTO products (
        customer_id, sku_code, name, description, material_type,
        width_mm, height_mm, thickness_micron, color_count, default_rate, rate_unit
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
      `,
      [
        customer_id,
        sku_code || null,
        name,
        description || null,
        material_type || null,
        width_mm || null,
        height_mm || null,
        thickness_micron || null,
        color_count || null,
        default_rate || null,
        rate_unit,
      ]
    );

    return NextResponse.json({ product: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

