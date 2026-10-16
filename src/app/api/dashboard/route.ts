import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { initCronJobs } from '@/lib/cron';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    initCronJobs();

    // 1. Fetch dashboard KPIs from v_dashboard
    const kpiRes = await query(`SELECT * FROM v_dashboard LIMIT 1`);
    const kpis = kpiRes.rows[0] || {
      active_orders: 0,
      new_orders: 0,
      pending_designs: 0,
      active_print_jobs: 0,
      active_lorries: 0,
      overdue_lorries: 0,
      godown_batch_count: 0,
      total_godown_stock_kg: 0,
      godown_aging_alerts: 0,
      total_outstanding: 0,
      payment_critical_count: 0,
      orders_pending_delivery: 0,
      orders_ready_to_deliver: 0,
    };

    // 2. Fetch critical alerts
    const overdueLorriesRes = await query(`
      SELECT * FROM v_lorry_tracker 
      WHERE tracking_status IN ('OVERDUE', 'NEEDS_TEMPO') 
      ORDER BY days_overdue DESC
    `);

    const godownAgingRes = await query(`
      SELECT * FROM v_godown_aging 
      WHERE aging_status IN ('CRITICAL', 'WARNING')
      ORDER BY days_in_godown DESC 
      LIMIT 10
    `);

    const stuckOrdersRes = await query(`
      SELECT * FROM v_stuck_orders 
      ORDER BY days_in_current_stage DESC 
      LIMIT 10
    `);

    const paymentAlertsRes = await query(`
      SELECT * FROM v_payment_followup 
      WHERE followup_urgency IN ('CRITICAL', 'NEVER_PAID', 'WARNING')
      LIMIT 10
    `);

    const readyToDeliverRes = await query(`
      SELECT * FROM v_pending_deliveries 
      WHERE can_fulfil_from_godown = true 
      ORDER BY order_date ASC 
      LIMIT 10
    `);

    const recentActivityRes = await query(`
      SELECT * FROM activity_log 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    return NextResponse.json({
      kpis,
      overdue_lorries: overdueLorriesRes.rows,
      godown_aging: godownAgingRes.rows,
      stuck_orders: stuckOrdersRes.rows,
      payment_alerts: paymentAlertsRes.rows,
      ready_to_deliver: readyToDeliverRes.rows,
      recent_activity: recentActivityRes.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

