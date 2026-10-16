import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/kanitham?schema=public',
});

async function runSeed() {
  const client = await pool.connect();
  console.log('Starting seed...');

  try {
    await client.query('BEGIN');

    // Clean existing data in reverse dependency order
    console.log('Cleaning existing data...');
    await client.query('DELETE FROM activity_log');
    await client.query('DELETE FROM order_status_history');
    await client.query('DELETE FROM delivery_items');
    await client.query('DELETE FROM deliveries');
    await client.query('DELETE FROM godown_batches');
    await client.query('DELETE FROM lorry_items');
    await client.query('DELETE FROM lorries');
    await client.query('DELETE FROM print_jobs');
    await client.query('DELETE FROM designs');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM printers');
    await client.query('DELETE FROM customers');

    // 1. Create Printers (Delhi)
    console.log('Seeding Delhi printers...');
    const p1 = await client.query(`
      INSERT INTO printers (name, contact_person, phone, email, address, city)
      VALUES
        ('Ravi Flexo Printers', 'Rakesh Sharma', '9811234567', 'ravi.flexo@gmail.com', 'Plot 42, Okhla Industrial Area Phase-II', 'Delhi'),
        ('Delhi Rotogravure Works', 'Sunil Kumar', '9822345678', 'sunil@delhigravure.in', 'B-12, Patparganj Industrial Area', 'Delhi'),
        ('Apex Packaging Solutions', 'Amit Verma', '9833456789', 'apex.pack@delhi.net', 'C-89, Naraina Industrial Area', 'Delhi')
      RETURNING id, name;
    `);
    const printers = p1.rows;

    // 2. Create Customers (Chennai FMCG)
    console.log('Seeding Chennai customers...');
    const c1 = await client.query(`
      INSERT INTO customers (
        name, company_type, gstn, contact_person, phone, whatsapp_number,
        address_line1, city, state, pincode, opening_balance_amount, opening_balance_date
      )
      VALUES
        (
          'Balaji Hot Chips & Snacks', 'CHIPS', '33AABCB1234F1Z0',
          'Suresh Babu', '9840123456', '9840123456',
          'No. 45, GST Road, Chromepet', 'Chennai', 'Tamil Nadu', '600044',
          45000.00, '2026-10-01'
        ),
        (
          'Madras Masala & Spice Mills', 'MASALA', '33AABCM5678K1Z5',
          'Venkatesh Iyer', '9840234567', '9840234567',
          'Plot 12, SIDCO Industrial Estate, Ambattur', 'Chennai', 'Tamil Nadu', '600058',
          125000.00, '2026-10-01'
        ),
        (
          'Anandham Groundnut Roasters', 'GROUNDNUT', '33AABCA9012P1Z8',
          'Karthik Raja', '9840345678', '9840345678',
          'Shop 8, Anna Fruit & Grain Market, Koyambedu', 'Chennai', 'Tamil Nadu', '600107',
          18500.00, '2026-10-01'
        ),
        (
          'Chettinad Traditional Pickles', 'PICKLE', '33AABCC3456Q1Z2',
          'Meenakshi Sundaram', '9840456789', '9840456789',
          'No. 18, North Mada Street, Mylapore', 'Chennai', 'Tamil Nadu', '600004',
          72000.00, '2026-10-01'
        ),
        (
          'Golden Crunch Snacks LLP', 'SNACKS', '33AABCG7890R1Z9',
          'Pradeep Kumar', '9840567890', '9840567890',
          'Survey 104, Kundrathur Main Road, Porur', 'Chennai', 'Tamil Nadu', '600116',
          0.00, '2026-10-01'
        )
      RETURNING id, name;
    `);
    const customers = c1.rows;

    // 3. Create Products per Customer
    console.log('Seeding customer products...');
    const balaji = customers.find((c) => c.name.includes('Balaji'));
    const masala = customers.find((c) => c.name.includes('Masala'));
    const groundnut = customers.find((c) => c.name.includes('Groundnut'));
    const pickle = customers.find((c) => c.name.includes('Pickle'));
    const golden = customers.find((c) => c.name.includes('Golden'));

    const pr1 = await client.query(`
      INSERT INTO products (customer_id, sku_code, name, material_type, width_mm, height_mm, thickness_micron, color_count, default_rate, rate_unit)
      VALUES
        ('${balaji.id}', 'BHC-POT-200G', 'Classic Potato Chips 200g Pouch', 'Metalized BOPP', 180, 240, 45, 6, 285.00, 'per_kg'),
        ('${balaji.id}', 'BHC-BAN-100G', 'Salted Banana Chips 100g Pouch', 'BOPP Poly', 150, 200, 38, 5, 270.00, 'per_kg'),
        ('${masala.id}', 'MMM-CHI-100G', 'Guntur Chilli Powder 100g 3-Ply Foil', 'PET/Foil/Poly', 130, 170, 60, 7, 340.00, 'per_kg'),
        ('${masala.id}', 'MMM-SAM-250G', 'Madras Sambar Powder 250g Zip Pouch', 'PET/Metalized/Poly', 160, 220, 55, 8, 325.00, 'per_kg'),
        ('${groundnut.id}', 'AGR-SPN-250G', 'Spicy Roasted Peanuts 250g Pillow Pouch', 'BOPP/Poly', 160, 220, 42, 5, 260.00, 'per_kg'),
        ('${pickle.id}', 'CTP-MAN-500G', 'Cut Mango Pickle 500g Standup Pouch', 'Polyester Laminated', 200, 280, 75, 6, 360.00, 'per_kg'),
        ('${golden.id}', 'GCS-MUR-200G', 'Butter Murukku 200g Nitrogen Pouch', 'Metalized BOPP', 170, 230, 45, 6, 280.00, 'per_kg')
      RETURNING id, customer_id, name, default_rate;
    `);
    const products = pr1.rows;

    const prodBalajiChips = products.find((p) => p.name.includes('Potato Chips'));
    const prodMasalaChilli = products.find((p) => p.name.includes('Chilli Powder'));
    const prodMasalaSambar = products.find((p) => p.name.includes('Sambar Powder'));
    const prodGroundnut = products.find((p) => p.name.includes('Spicy Roasted Peanuts'));
    const prodPickle = products.find((p) => p.name.includes('Mango Pickle'));
    const prodGoldenMurukku = products.find((p) => p.name.includes('Murukku'));

    // 4. Create Orders across lifecycle stages
    console.log('Seeding orders across 13 stages...');
    // Order 1: ORDER_RECEIVED (New order)
    const o1 = await client.query(`
      INSERT INTO orders (customer_id, product_id, order_date, expected_delivery_date, quantity_ordered, quantity_unit, rate_per_unit, total_amount, status)
      VALUES ('${golden.id}', '${prodGoldenMurukku.id}', CURRENT_DATE - 1, CURRENT_DATE + 14, 500.00, 'kg', 280.00, 140000.00, 'ORDER_RECEIVED')
      RETURNING id, order_number;
    `);

    // Order 2: DESIGN_IN_PROGRESS
    const o2 = await client.query(`
      INSERT INTO orders (customer_id, product_id, order_date, expected_delivery_date, quantity_ordered, quantity_unit, rate_per_unit, total_amount, status)
      VALUES ('${balaji.id}', '${prodBalajiChips.id}', CURRENT_DATE - 4, CURRENT_DATE + 10, 800.00, 'kg', 285.00, 228000.00, 'DESIGN_IN_PROGRESS')
      RETURNING id, order_number;
    `);

    // Order 3: PRINTING in Delhi (Stuck order check: make status_changed_at 9 days ago to test v_stuck_orders)
    const o3 = await client.query(`
      INSERT INTO orders (customer_id, product_id, order_date, expected_delivery_date, quantity_ordered, quantity_unit, rate_per_unit, total_amount, status, status_changed_at)
      VALUES ('${masala.id}', '${prodMasalaChilli.id}', CURRENT_DATE - 12, CURRENT_DATE + 5, 1200.00, 'kg', 340.00, 408000.00, 'PRINTING', now() - INTERVAL '9 days')
      RETURNING id, order_number;
    `);

    // Order 4: IN_TRANSIT (On overdue lorry)
    const o4 = await client.query(`
      INSERT INTO orders (customer_id, product_id, order_date, expected_delivery_date, quantity_ordered, quantity_unit, rate_per_unit, total_amount, status)
      VALUES ('${groundnut.id}', '${prodGroundnut.id}', CURRENT_DATE - 10, CURRENT_DATE - 1, 600.00, 'kg', 260.00, 156000.00, 'IN_TRANSIT')
      RETURNING id, order_number;
    `);

    // Order 5: ARRIVED_AT_LORRY_OFFICE (Needs tempo)
    const o5 = await client.query(`
      INSERT INTO orders (customer_id, product_id, order_date, expected_delivery_date, quantity_ordered, quantity_unit, rate_per_unit, total_amount, status)
      VALUES ('${balaji.id}', '${prodBalajiChips.id}', CURRENT_DATE - 14, CURRENT_DATE + 2, 1000.00, 'kg', 285.00, 285000.00, 'ARRIVED_AT_LORRY_OFFICE')
      RETURNING id, order_number;
    `);

    // Order 6: RECEIVED_IN_GODOWN (Aging stock test: batch received 35 days ago to trigger CRITICAL aging alert)
    const o6 = await client.query(`
      INSERT INTO orders (customer_id, product_id, order_date, expected_delivery_date, quantity_ordered, quantity_unit, rate_per_unit, total_amount, status)
      VALUES ('${pickle.id}', '${prodPickle.id}', CURRENT_DATE - 40, CURRENT_DATE - 20, 1500.00, 'kg', 360.00, 540000.00, 'RECEIVED_IN_GODOWN')
      RETURNING id, order_number;
    `);

    // Order 7: PARTIALLY_DELIVERED (600kg delivered, 400kg remaining in godown)
    const o7 = await client.query(`
      INSERT INTO orders (customer_id, product_id, order_date, expected_delivery_date, quantity_ordered, quantity_unit, rate_per_unit, total_amount, status)
      VALUES ('${masala.id}', '${prodMasalaSambar.id}', CURRENT_DATE - 25, CURRENT_DATE - 5, 1000.00, 'kg', 325.00, 325000.00, 'PARTIALLY_DELIVERED')
      RETURNING id, order_number;
    `);

    // Order 8: FULLY_DELIVERED & CLOSED
    const o8 = await client.query(`
      INSERT INTO orders (customer_id, product_id, order_date, expected_delivery_date, quantity_ordered, quantity_unit, rate_per_unit, total_amount, status)
      VALUES ('${golden.id}', '${prodGoldenMurukku.id}', CURRENT_DATE - 30, CURRENT_DATE - 10, 400.00, 'kg', 280.00, 112000.00, 'CLOSED')
      RETURNING id, order_number;
    `);

    // 5. Designs
    console.log('Seeding designs...');
    await client.query(`
      INSERT INTO designs (order_id, version_number, status, file_url, file_name, customer_feedback, sent_for_approval_at)
      VALUES
        ('${o2.rows[0].id}', 1, 'IN_PROGRESS', '/designs/balaji_chips_v1.pdf', 'balaji_chips_v1.pdf', 'Client wants brighter yellow for background', now() - INTERVAL '3 days'),
        ('${o3.rows[0].id}', 1, 'APPROVED', '/designs/madras_chilli_v1.pdf', 'madras_chilli_v1.pdf', 'Approved without changes', now() - INTERVAL '10 days')
    `);

    // 6. Print Jobs
    console.log('Seeding print jobs in Delhi...');
    const pj1 = await client.query(`
      INSERT INTO print_jobs (
        order_id, printer_id, material_type, width_mm, height_mm, color_count,
        quantity, quantity_unit, sent_date, expected_dispatch_date, status, cost_per_unit, total_cost
      )
      VALUES
        ('${o3.rows[0].id}', '${printers[0].id}', 'PET/Foil/Poly', 130, 170, 7, 1200.00, 'kg', CURRENT_DATE - 10, CURRENT_DATE - 2, 'IN_PRODUCTION', 190.00, 228000.00),
        ('${o4.rows[0].id}', '${printers[1].id}', 'BOPP/Poly', 160, 220, 5, 600.00, 'kg', CURRENT_DATE - 15, CURRENT_DATE - 7, 'DISPATCHED', 160.00, 96000.00),
        ('${o5.rows[0].id}', '${printers[0].id}', 'Metalized BOPP', 180, 240, 6, 1000.00, 'kg', CURRENT_DATE - 20, CURRENT_DATE - 10, 'DISPATCHED', 175.00, 175000.00)
      RETURNING id, order_id;
    `);

    // 7. Lorries & Manifests
    console.log('Seeding lorries from Delhi to Chennai...');
    // Lorry A: Overdue (dispatched 6 days ago, ETA was 2 days ago, still IN_TRANSIT)
    const lA = await client.query(`
      INSERT INTO lorries (
        lr_number, booking_date, transporter_name, transporter_phone, driver_name, driver_phone,
        vehicle_number, origin_city, destination_city, dispatch_date, expected_arrival_date,
        lorry_office_name, lorry_office_phone, status, freight_cost, freight_paid
      )
      VALUES (
        'LR-DEL-98442', CURRENT_DATE - 7, 'VRL Logistics Delhi-Chennai Express', '9811002233',
        'Harpreet Singh', '9811005566', 'DL 01 AA 4082', 'Delhi', 'Chennai',
        CURRENT_DATE - 6, CURRENT_DATE - 2, 'VRL Madhavaram Transport Depot', '044-2553001',
        'IN_TRANSIT', 24500.00, true
      )
      RETURNING id;
    `);

    await client.query(`
      INSERT INTO lorry_items (lorry_id, order_id, customer_id, product_id, quantity, quantity_unit, weight_kg)
      VALUES
        ('${lA.rows[0].id}', '${o4.rows[0].id}', '${groundnut.id}', '${prodGroundnut.id}', 600.00, 'kg', 600.00)
    `);

    // Lorry B: Arrived at office, needs tempo (ARRIVED_AT_OFFICE, tempo_booked = false)
    const lB = await client.query(`
      INSERT INTO lorries (
        lr_number, booking_date, transporter_name, transporter_phone, driver_name, driver_phone,
        vehicle_number, origin_city, destination_city, dispatch_date, expected_arrival_date, actual_arrival_date,
        lorry_office_name, lorry_office_phone, tempo_booked, status, freight_cost, freight_paid
      )
      VALUES (
        'LR-ARC-11094', CURRENT_DATE - 8, 'Associated Road Carriers (ARC)', '9811223344',
        'Ramkishan Yadav', '9811998877', 'HR 55 B 8219', 'Delhi', 'Chennai',
        CURRENT_DATE - 7, CURRENT_DATE - 1, CURRENT_DATE,
        'ARC Depot No. 5, Koyambedu Hub', '044-2479002', false,
        'ARRIVED_AT_OFFICE', 32000.00, false
      )
      RETURNING id;
    `);

    await client.query(`
      INSERT INTO lorry_items (lorry_id, order_id, customer_id, product_id, quantity, quantity_unit, weight_kg)
      VALUES
        ('${lB.rows[0].id}', '${o5.rows[0].id}', '${balaji.id}', '${prodBalajiChips.id}', 1000.00, 'kg', 1000.00)
    `);

    // 8. Godown Batches (Inventory & Aging)
    console.log('Seeding Godown Batches...');
    // Batch 1: Aged 35 days (CRITICAL alert)
    const gb1 = await client.query(`
      INSERT INTO godown_batches (
        order_id, customer_id, product_id, quantity_received, quantity_remaining, quantity_unit, received_date, notes
      )
      VALUES
        ('${o6.rows[0].id}', '${pickle.id}', '${prodPickle.id}', 1500.00, 1500.00, 'kg', CURRENT_DATE - 35, 'Customer delayed packaging run')
      RETURNING id;
    `);

    // Batch 2: Aged 18 days (WARNING alert, partially delivered)
    const gb2 = await client.query(`
      INSERT INTO godown_batches (
        order_id, customer_id, product_id, quantity_received, quantity_remaining, quantity_unit, received_date, notes
      )
      VALUES
        ('${o7.rows[0].id}', '${masala.id}', '${prodMasalaSambar.id}', 1000.00, 400.00, 'kg', CURRENT_DATE - 18, '600kg dispatched on Challan 1001')
      RETURNING id;
    `);

    // Batch 3: Fresh stock (Normal aging, 4 days)
    const gb3 = await client.query(`
      INSERT INTO godown_batches (
        order_id, customer_id, product_id, quantity_received, quantity_remaining, quantity_unit, received_date, notes
      )
      VALUES
        ('${o8.rows[0].id}', '${golden.id}', '${prodGoldenMurukku.id}', 400.00, 0.00, 'kg', CURRENT_DATE - 12, 'Fully delivered')
      RETURNING id;
    `);

    // 9. Deliveries
    console.log('Seeding Deliveries & Challans...');
    const del1 = await client.query(`
      INSERT INTO deliveries (
        order_id, customer_id, delivery_date, delivery_type, quantity_delivered, quantity_unit,
        delivery_mode, vehicle_number, received_by, notes
      )
      VALUES
        ('${o7.rows[0].id}', '${masala.id}', CURRENT_DATE - 10, 'PARTIAL', 600.00, 'kg', 'Tempo', 'TN 09 CK 3312', 'Murugan (Store Mgr)', 'First installment')
      RETURNING id, challan_number;
    `);

    await client.query(`
      INSERT INTO delivery_items (delivery_id, godown_batch_id, quantity)
      VALUES ('${del1.rows[0].id}', '${gb2.rows[0].id}', 600.00)
    `);

    const del2 = await client.query(`
      INSERT INTO deliveries (
        order_id, customer_id, delivery_date, delivery_type, quantity_delivered, quantity_unit,
        delivery_mode, vehicle_number, received_by, notes
      )
      VALUES
        ('${o8.rows[0].id}', '${golden.id}', CURRENT_DATE - 8, 'FULL', 400.00, 'kg', 'Own tempo', 'TN 05 AF 9901', 'Pradeep Kumar', 'Full delivery completed')
      RETURNING id, challan_number;
    `);

    // 10. Payments & Ledgers
    console.log('Seeding customer payments...');
    // Balaji: Paid 50,000 via RTGS 5 days ago (Normal)
    await client.query(`
      INSERT INTO payments (customer_id, amount, payment_date, payment_mode, reference_number, bank_name)
      VALUES ('${balaji.id}', 50000.00, CURRENT_DATE - 5, 'RTGS', 'HDFC26100599182', 'HDFC Bank');
    `);

    // Madras Masala: Paid 100,000 via NEFT 20 days ago
    await client.query(`
      INSERT INTO payments (customer_id, amount, payment_date, payment_mode, reference_number, bank_name)
      VALUES ('${masala.id}', 100000.00, CURRENT_DATE - 20, 'NEFT', 'SBIN004491028', 'State Bank of India');
    `);

    // Golden Crunch: Paid 112,000 via GPAY 4 days ago
    await client.query(`
      INSERT INTO payments (customer_id, amount, payment_date, payment_mode, reference_number, bank_name)
      VALUES ('${golden.id}', 112000.00, CURRENT_DATE - 4, 'GPAY', 'UPI-GPAY-99410291', 'ICICI Bank');
    `);

    // Chettinad Pickles: Has opening balance 72,000 + Order 540,000, NEVER paid! (NEVER_PAID urgency)
    // Anandham Groundnut: Has opening balance 18,500 + Order 156,000, last paid > 65 days ago (CRITICAL urgency)
    await client.query(`
      INSERT INTO payments (customer_id, amount, payment_date, payment_mode, reference_number, bank_name)
      VALUES ('${groundnut.id}', 10000.00, CURRENT_DATE - 68, 'CASH', 'REC-CASH-081', 'Cash at Godown');
    `);

    // 11. Activity Log audit entries
    console.log('Seeding activity logs...');
    await client.query(`
      INSERT INTO activity_log (entity_type, entity_id, action, description)
      VALUES
        ('order', '${o1.rows[0].id}', 'created', 'Created Order #${o1.rows[0].order_number} for Golden Crunch (500kg)'),
        ('lorry', '${lA.rows[0].id}', 'status_changed', 'Lorry LR-DEL-98442 flagged OVERDUE by 2 days'),
        ('godown_batch', '${gb1.rows[0].id}', 'aging_alert', 'Batch for Chettinad Pickles reached 35 days in godown (CRITICAL)'),
        ('payment', '${balaji.id}', 'created', 'Payment of Rs. 50,000 received via RTGS from Balaji Chips')
    `);

    await client.query('COMMIT');
    console.log('Seed completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
