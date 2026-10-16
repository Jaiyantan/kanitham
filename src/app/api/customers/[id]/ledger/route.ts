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
      `SELECT id, name, opening_balance_amount, opening_balance_date FROM customers WHERE id = $1`,
      [id]
    );

    if (customerRes.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = customerRes.rows[0];
    const openingBalance = Number(customer.opening_balance_amount || 0);

    // Ledger transactions from view
    const ledgerRes = await query(
      `SELECT * FROM v_customer_ledger WHERE customer_id = $1 ORDER BY txn_date ASC, sort_ts ASC`,
      [id]
    );

    let runningBalance = openingBalance;
    const entries = ledgerRes.rows.map((row) => {
      const debit = Number(row.debit || 0);
      const credit = Number(row.credit || 0);
      runningBalance = runningBalance + debit - credit;
      return {
        ...row,
        debit,
        credit,
        balance_running: runningBalance,
      };
    });

    return NextResponse.json({
      customer,
      opening_balance: openingBalance,
      opening_balance_date: customer.opening_balance_date,
      entries,
      final_outstanding: runningBalance,
    });
  } catch (error: any) {
    console.error('Error fetching customer ledger:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

