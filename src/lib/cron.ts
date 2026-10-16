import cron from 'node-cron';
import { query } from './db';

let cronInitialized = false;

export function initCronJobs() {
  if (cronInitialized || process.env.NODE_ENV === 'test') {
    return;
  }
  cronInitialized = true;
  console.log('[CRON] Initializing operational intelligence background jobs...');

  // 1. Daily 6:00 AM: Check overdue lorries & godown aging
  cron.schedule('0 6 * * *', async () => {
    try {
      console.log('[CRON 06:00] Running daily transit and godown checks...');

      // Overdue lorries
      const overdue = await query(`
        SELECT lorry_id, lr_number, days_overdue FROM v_lorry_tracker WHERE tracking_status = 'OVERDUE'
      `);
      for (const row of overdue.rows) {
        await query(
          `INSERT INTO activity_log (entity_type, entity_id, action, description) VALUES ($1, $2, $3, $4)`,
          ['lorry', row.lorry_id, 'alert', `Daily Cron: LR #${row.lr_number} is overdue by ${row.days_overdue} days`]
        );
      }

      // Godown aging
      const aging = await query(`
        SELECT batch_id, customer_name, days_in_godown FROM v_godown_aging WHERE aging_status = 'CRITICAL'
      `);
      for (const row of aging.rows) {
        await query(
          `INSERT INTO activity_log (entity_type, entity_id, action, description) VALUES ($1, $2, $3, $4)`,
          ['godown_batch', row.batch_id, 'alert', `Daily Cron: Stock for ${row.customer_name} has aged ${row.days_in_godown} days in godown`]
        );
      }
    } catch (err) {
      console.error('[CRON ERROR] Daily 6 AM job failed:', err);
    }
  });

  // 2. Daily 8:00 AM: Payment follow-up priority log
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('[CRON 08:00] Running payment follow-up monitor...');
      const urgentPayments = await query(`
        SELECT customer_id, customer_name, outstanding_amount, followup_urgency
        FROM v_payment_followup
        WHERE followup_urgency IN ('CRITICAL', 'NEVER_PAID')
      `);
      for (const row of urgentPayments.rows) {
        await query(
          `INSERT INTO activity_log (entity_type, entity_id, action, description) VALUES ($1, $2, $3, $4)`,
          ['payment', row.customer_id, 'followup_reminder', `Collections alert: ${row.customer_name} outstanding ₹${Number(row.outstanding_amount).toLocaleString('en-IN')} (${row.followup_urgency})`]
        );
      }
    } catch (err) {
      console.error('[CRON ERROR] Daily 8 AM job failed:', err);
    }
  });

  console.log('[CRON] Background scheduler registered successfully');
}

