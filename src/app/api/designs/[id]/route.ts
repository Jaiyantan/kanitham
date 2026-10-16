import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, approved_by, customer_feedback, internal_notes } = body;

    const result = await transaction(async (client) => {
      const cur = await client.query(`SELECT * FROM designs WHERE id = $1`, [id]);
      if (cur.rows.length === 0) {
        throw new Error('Design not found');
      }
      const design = cur.rows[0];

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (status !== undefined) {
        updates.push(`status = $${idx++}`);
        values.push(status);

        if (status === 'APPROVED') {
          updates.push(`approved_at = now()`);
          if (approved_by) {
            updates.push(`approved_by = $${idx++}`);
            values.push(approved_by);
          }
        }
      }

      if (customer_feedback !== undefined) {
        updates.push(`customer_feedback = $${idx++}`);
        values.push(customer_feedback);
      }
      if (internal_notes !== undefined) {
        updates.push(`internal_notes = $${idx++}`);
        values.push(internal_notes);
      }

      if (updates.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE designs SET ${updates.join(', ')} WHERE id = $${idx}`,
          values
        );
      }

      // If approved, advance order status
      if (status === 'APPROVED') {
        await client.query(
          `UPDATE orders SET status = 'DESIGN_APPROVED' WHERE id = $1 AND status IN ('DESIGN_PENDING', 'DESIGN_IN_PROGRESS')`,
          [design.order_id]
        );
      }

      const updated = await client.query(`SELECT * FROM designs WHERE id = $1`, [id]);
      return updated.rows[0];
    });

    return NextResponse.json({ design: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

