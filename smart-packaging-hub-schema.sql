-- ================================================================
-- SMART PACKAGING HUB — Complete Database Schema
-- PostgreSQL 15+ / Supabase
--
-- Run this file in Supabase SQL Editor to create the full schema.
-- ================================================================


-- ================================================================
-- ENUMS
-- ================================================================

CREATE TYPE company_type AS ENUM (
  'SNACKS',
  'CHIPS',
  'GROUNDNUT',
  'PICKLE',
  'MASALA',
  'FMCG_OTHER',
  'OTHER'
);

CREATE TYPE order_status AS ENUM (
  'ORDER_RECEIVED',
  'DESIGN_PENDING',
  'DESIGN_IN_PROGRESS',
  'DESIGN_APPROVED',
  'SENT_TO_PRINT',
  'PRINTING',
  'PRINT_DISPATCHED',
  'IN_TRANSIT',
  'ARRIVED_AT_LORRY_OFFICE',
  'RECEIVED_IN_GODOWN',
  'PARTIALLY_DELIVERED',
  'FULLY_DELIVERED',
  'CLOSED'
);

CREATE TYPE design_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'SENT_FOR_APPROVAL',
  'REVISION_REQUIRED',
  'APPROVED',
  'SENT_TO_PRINT'
);

CREATE TYPE print_job_status AS ENUM (
  'ORDER_PLACED',
  'IN_PRODUCTION',
  'READY_FOR_DISPATCH',
  'DISPATCHED'
);

CREATE TYPE lorry_status AS ENUM (
  'BOOKED',
  'DISPATCHED',
  'IN_TRANSIT',
  'ARRIVED_AT_OFFICE',
  'TEMPO_BOOKED',
  'PICKED_UP',
  'RECEIVED_IN_GODOWN'
);

CREATE TYPE payment_mode AS ENUM (
  'RTGS',
  'NEFT',
  'CASH',
  'GPAY',
  'UPI_OTHER',
  'CHEQUE'
);

CREATE TYPE delivery_type AS ENUM (
  'FULL',
  'PARTIAL'
);


-- ================================================================
-- FUNCTIONS — shared utilities
-- ================================================================

-- Auto-bump updated_at on every UPDATE
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ================================================================
-- TABLE: customers
-- ================================================================

CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name          TEXT NOT NULL,
  company_type  company_type NOT NULL DEFAULT 'OTHER',
  gstn          VARCHAR(15),                     -- 15-char GST number

  contact_person    TEXT,
  phone             VARCHAR(15),
  phone_secondary   VARCHAR(15),
  email             TEXT,
  whatsapp_number   VARCHAR(15),                 -- for statement sharing

  address_line1     TEXT,
  address_line2     TEXT,
  city              TEXT DEFAULT 'Chennai',
  state             TEXT DEFAULT 'Tamil Nadu',
  pincode           VARCHAR(6),

  -- Historical migration: outstanding balance as of system start date.
  -- Positive = customer owes us.  Negative = we owe customer.
  opening_balance_amount  NUMERIC(12,2) DEFAULT 0,
  opening_balance_date    DATE,

  notes       TEXT,
  is_active   BOOLEAN DEFAULT true,

  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ                        -- soft delete
);

CREATE TRIGGER trg_customers_updated
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
-- TABLE: products  (SKUs — defined per customer)
-- ================================================================

CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id),

  sku_code      VARCHAR(50),                     -- internal code
  name          TEXT NOT NULL,                   -- "Chips 500g Cover"
  description   TEXT,

  -- Print / material specs
  material_type       TEXT,                      -- BOPP, Polyester, Metalized …
  width_mm            NUMERIC(8,2),
  height_mm           NUMERIC(8,2),
  thickness_micron    NUMERIC(6,2),
  color_count         INTEGER,                   -- colours in print

  -- Default pricing (can be overridden per order)
  default_rate    NUMERIC(10,2),
  rate_unit       TEXT DEFAULT 'per_kg',          -- per_kg | per_piece | per_roll

  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE (customer_id, sku_code)
);

CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
-- TABLE: orders
-- ================================================================

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    BIGINT GENERATED ALWAYS AS IDENTITY,   -- human-readable #

  customer_id     UUID NOT NULL REFERENCES customers(id),
  product_id      UUID REFERENCES products(id),

  order_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date  DATE,

  -- Quantity & pricing
  quantity_ordered    NUMERIC(10,2) NOT NULL,
  quantity_unit       TEXT DEFAULT 'kg',          -- kg | pieces | rolls | tonnes
  rate_per_unit       NUMERIC(10,2) NOT NULL,
  total_amount        NUMERIC(14,2) NOT NULL,    -- computed in app: qty * rate (+/- adjustments)

  -- Status
  status              order_status DEFAULT 'ORDER_RECEIVED',
  status_changed_at   TIMESTAMPTZ DEFAULT now(),

  -- Historical flag: true = entered for record-keeping only.
  -- Financial totals already baked into customer.opening_balance_amount.
  is_historical   BOOLEAN DEFAULT false,

  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
-- TABLE: order_status_history  (powers "days in stage")
-- ================================================================

CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  old_status  order_status,
  new_status  order_status NOT NULL,
  changed_at  TIMESTAMPTZ DEFAULT now(),
  changed_by  TEXT                               -- future: auth user id
);

-- Auto-log every status change on orders
CREATE OR REPLACE FUNCTION fn_log_order_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = now();
    INSERT INTO order_status_history (order_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_change
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_log_order_status();


-- ================================================================
-- TABLE: designs  (versioned per order)
-- ================================================================

CREATE TABLE designs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  version_number  INTEGER NOT NULL DEFAULT 1,

  status          design_status DEFAULT 'PENDING',

  file_url        TEXT,                          -- storage path or URL
  file_name       TEXT,

  customer_feedback   TEXT,
  internal_notes      TEXT,

  sent_for_approval_at  TIMESTAMPTZ,
  approved_at           TIMESTAMPTZ,
  approved_by           TEXT,                    -- customer contact name

  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE (order_id, version_number)
);

CREATE TRIGGER trg_designs_updated
  BEFORE UPDATE ON designs
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
-- TABLE: printers  (Delhi printing partners)
-- ================================================================

CREATE TABLE printers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  contact_person  TEXT,
  phone           VARCHAR(15),
  email           TEXT,
  address         TEXT,
  city            TEXT DEFAULT 'Delhi',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_printers_updated
  BEFORE UPDATE ON printers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
-- TABLE: print_jobs  (jobs sent to Delhi printer)
-- ================================================================

CREATE TABLE print_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id    UUID NOT NULL REFERENCES orders(id),
  design_id   UUID REFERENCES designs(id),       -- approved design version
  printer_id  UUID REFERENCES printers(id),

  -- Specs (snapshot — may differ from product defaults)
  material_type   TEXT,
  width_mm        NUMERIC(8,2),
  height_mm       NUMERIC(8,2),
  color_count     INTEGER,
  quantity        NUMERIC(10,2) NOT NULL,
  quantity_unit   TEXT DEFAULT 'kg',

  -- Dates
  sent_date               DATE,
  expected_dispatch_date   DATE,
  actual_dispatch_date     DATE,

  -- Cost
  cost_per_unit   NUMERIC(10,2),
  total_cost      NUMERIC(14,2),

  status      print_job_status DEFAULT 'ORDER_PLACED',
  notes       TEXT,

  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_print_jobs_updated
  BEFORE UPDATE ON print_jobs
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
-- TABLE: lorries  (shipments from Delhi to Chennai)
-- ================================================================

CREATE TABLE lorries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  lr_number       VARCHAR(50) NOT NULL,          -- Lorry Receipt number
  booking_date    DATE,

  -- Transporter
  transporter_name    TEXT NOT NULL,
  transporter_phone   VARCHAR(15),
  driver_name         TEXT,
  driver_phone        VARCHAR(15),
  vehicle_number      VARCHAR(20),

  -- Route
  origin_city         TEXT DEFAULT 'Delhi',
  destination_city    TEXT DEFAULT 'Chennai',

  -- Key dates
  dispatch_date           DATE,
  expected_arrival_date   DATE,
  actual_arrival_date     DATE,

  -- Lorry office at destination
  lorry_office_name       TEXT,
  lorry_office_address    TEXT,
  lorry_office_phone      VARCHAR(15),

  -- Tempo pickup
  tempo_booked        BOOLEAN DEFAULT false,
  tempo_booking_date  DATE,
  tempo_cost          NUMERIC(10,2),
  tempo_vehicle_number VARCHAR(20),
  pickup_date         DATE,

  -- Cost
  freight_cost    NUMERIC(10,2),
  freight_paid    BOOLEAN DEFAULT false,

  status      lorry_status DEFAULT 'BOOKED',
  notes       TEXT,

  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_lorries_updated
  BEFORE UPDATE ON lorries
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
-- TABLE: lorry_items  (manifest — what is on each lorry)
-- ================================================================

CREATE TABLE lorry_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  lorry_id        UUID NOT NULL REFERENCES lorries(id) ON DELETE CASCADE,
  print_job_id    UUID REFERENCES print_jobs(id),
  order_id        UUID NOT NULL REFERENCES orders(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  product_id      UUID REFERENCES products(id),

  quantity        NUMERIC(10,2) NOT NULL,
  quantity_unit   TEXT DEFAULT 'kg',
  weight_kg       NUMERIC(10,2),                 -- for freight split

  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ================================================================
-- TABLE: godown_batches  (inventory received into godown)
-- ================================================================

CREATE TABLE godown_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source traceability
  lorry_id        UUID REFERENCES lorries(id),
  lorry_item_id   UUID REFERENCES lorry_items(id),
  order_id        UUID NOT NULL REFERENCES orders(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  product_id      UUID REFERENCES products(id),

  -- Stock
  quantity_received   NUMERIC(10,2) NOT NULL,
  quantity_remaining  NUMERIC(10,2) NOT NULL,    -- decremented on delivery
  quantity_unit       TEXT DEFAULT 'kg',

  received_date   DATE NOT NULL DEFAULT CURRENT_DATE,

  is_historical   BOOLEAN DEFAULT false,
  notes           TEXT,

  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT chk_remaining_non_negative CHECK (quantity_remaining >= 0)
);

CREATE TRIGGER trg_godown_updated
  BEFORE UPDATE ON godown_batches
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
-- TABLE: deliveries
-- ================================================================

CREATE TABLE deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_number  BIGINT GENERATED ALWAYS AS IDENTITY,

  order_id        UUID NOT NULL REFERENCES orders(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),

  delivery_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_type       delivery_type DEFAULT 'PARTIAL',

  quantity_delivered   NUMERIC(10,2) NOT NULL,
  quantity_unit        TEXT DEFAULT 'kg',

  -- Logistics
  delivery_mode       TEXT,                      -- "Own vehicle", "Customer pickup", "Courier"
  vehicle_number      VARCHAR(20),
  received_by         TEXT,                      -- name of person who received

  is_historical   BOOLEAN DEFAULT false,
  notes           TEXT,

  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_deliveries_updated
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
-- TABLE: delivery_items  (which godown batches were drawn from)
-- ================================================================

CREATE TABLE delivery_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  delivery_id       UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  godown_batch_id   UUID NOT NULL REFERENCES godown_batches(id),

  quantity          NUMERIC(10,2) NOT NULL,

  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ================================================================
-- TABLE: payments  (at customer level, not per-order)
-- ================================================================

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_id     UUID NOT NULL REFERENCES customers(id),

  amount          NUMERIC(14,2) NOT NULL,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode    payment_mode NOT NULL,

  reference_number    VARCHAR(100),              -- UTR for RTGS, txn id for GPay
  bank_name           TEXT,

  is_historical   BOOLEAN DEFAULT false,
  notes           TEXT,

  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
-- TABLE: activity_log  (audit trail)
-- ================================================================

CREATE TABLE activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  entity_type     TEXT NOT NULL,                 -- 'order', 'payment', 'lorry' …
  entity_id       UUID NOT NULL,
  action          TEXT NOT NULL,                 -- 'created', 'updated', 'status_changed' …

  description     TEXT,                          -- "Payment of Rs.25,000 via RTGS"
  old_data        JSONB,
  new_data        JSONB,

  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ================================================================
-- TABLE: app_settings  (configurable thresholds)
-- ================================================================

CREATE TABLE app_settings (
  key           TEXT PRIMARY KEY,
  value         JSONB NOT NULL,
  description   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

INSERT INTO app_settings (key, value, description) VALUES
  ('system_start_date',             '"2026-10-01"',   'Date from which live tracking begins; older records are historical'),
  ('godown_aging_warning_days',     '15',             'Days in godown before yellow warning'),
  ('godown_aging_alert_days',       '30',             'Days in godown before red alert'),
  ('payment_overdue_warning_days',  '30',             'Days overdue before payment warning'),
  ('payment_overdue_alert_days',    '60',             'Days overdue before critical payment alert'),
  ('lorry_overdue_days',            '2',              'Days past ETA before lorry shows overdue'),
  ('order_stuck_warning_days',      '7',              'Days in one stage before order flagged as stuck');


-- ================================================================
-- INDEXES
-- ================================================================

-- customers
CREATE INDEX idx_customers_active       ON customers (is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_type         ON customers (company_type);
CREATE INDEX idx_customers_name         ON customers (name);

-- products
CREATE INDEX idx_products_customer      ON products (customer_id);

-- orders
CREATE INDEX idx_orders_customer        ON orders (customer_id);
CREATE INDEX idx_orders_product         ON orders (product_id);
CREATE INDEX idx_orders_status          ON orders (status);
CREATE INDEX idx_orders_date            ON orders (order_date DESC);
CREATE INDEX idx_orders_open            ON orders (status, customer_id)
  WHERE deleted_at IS NULL AND status NOT IN ('FULLY_DELIVERED', 'CLOSED');

-- designs
CREATE INDEX idx_designs_order          ON designs (order_id);
CREATE INDEX idx_designs_pending        ON designs (status)
  WHERE status IN ('PENDING', 'IN_PROGRESS', 'SENT_FOR_APPROVAL', 'REVISION_REQUIRED');

-- print_jobs
CREATE INDEX idx_pjobs_order            ON print_jobs (order_id);
CREATE INDEX idx_pjobs_status           ON print_jobs (status);

-- lorries
CREATE INDEX idx_lorries_lr             ON lorries (lr_number);
CREATE INDEX idx_lorries_status         ON lorries (status);
CREATE INDEX idx_lorries_eta            ON lorries (expected_arrival_date);
CREATE INDEX idx_lorries_active         ON lorries (status)
  WHERE status NOT IN ('RECEIVED_IN_GODOWN');

-- lorry_items
CREATE INDEX idx_litems_lorry           ON lorry_items (lorry_id);
CREATE INDEX idx_litems_order           ON lorry_items (order_id);
CREATE INDEX idx_litems_customer        ON lorry_items (customer_id);

-- godown_batches
CREATE INDEX idx_godown_customer        ON godown_batches (customer_id);
CREATE INDEX idx_godown_order           ON godown_batches (order_id);
CREATE INDEX idx_godown_has_stock       ON godown_batches (customer_id, received_date)
  WHERE quantity_remaining > 0;

-- deliveries
CREATE INDEX idx_deliveries_order       ON deliveries (order_id);
CREATE INDEX idx_deliveries_customer    ON deliveries (customer_id);
CREATE INDEX idx_deliveries_date        ON deliveries (delivery_date DESC);

-- delivery_items
CREATE INDEX idx_ditems_delivery        ON delivery_items (delivery_id);
CREATE INDEX idx_ditems_batch           ON delivery_items (godown_batch_id);

-- payments
CREATE INDEX idx_payments_customer      ON payments (customer_id);
CREATE INDEX idx_payments_date          ON payments (payment_date DESC);
CREATE INDEX idx_payments_mode          ON payments (payment_mode);

-- order_status_history
CREATE INDEX idx_osh_order              ON order_status_history (order_id);
CREATE INDEX idx_osh_date               ON order_status_history (changed_at DESC);

-- activity_log
CREATE INDEX idx_alog_entity            ON activity_log (entity_type, entity_id);
CREATE INDEX idx_alog_date              ON activity_log (created_at DESC);


-- ================================================================
-- VIEWS — Intelligence Layer
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Customer outstanding balance
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_customer_outstanding AS
SELECT
  c.id                AS customer_id,
  c.name              AS customer_name,
  c.company_type,
  c.phone,
  c.whatsapp_number,

  COALESCE(c.opening_balance_amount, 0) AS opening_balance,
  COALESCE(inv.total_invoiced, 0)       AS total_invoiced,
  COALESCE(pay.total_paid, 0)           AS total_paid,

  -- outstanding = opening + invoiced (non-historical) - paid (non-historical)
  (
    COALESCE(c.opening_balance_amount, 0)
    + COALESCE(inv.total_invoiced, 0)
    - COALESCE(pay.total_paid, 0)
  ) AS outstanding_amount,

  COALESCE(inv.active_order_count, 0)   AS active_orders,
  pay.last_payment_date,

  CASE
    WHEN pay.last_payment_date IS NULL THEN NULL
    ELSE CURRENT_DATE - pay.last_payment_date
  END AS days_since_last_payment

FROM customers c

LEFT JOIN (
  SELECT
    customer_id,
    SUM(total_amount)  AS total_invoiced,
    COUNT(*) FILTER (
      WHERE status NOT IN ('FULLY_DELIVERED', 'CLOSED')
    ) AS active_order_count
  FROM orders
  WHERE deleted_at IS NULL
    AND is_historical = false
  GROUP BY customer_id
) inv ON inv.customer_id = c.id

LEFT JOIN (
  SELECT
    customer_id,
    SUM(amount)           AS total_paid,
    MAX(payment_date)     AS last_payment_date
  FROM payments
  WHERE is_historical = false
  GROUP BY customer_id
) pay ON pay.customer_id = c.id

WHERE c.deleted_at IS NULL
  AND c.is_active = true;


-- ----------------------------------------------------------------
-- 2. Godown aging  (stock currently sitting in godown)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_godown_aging AS
SELECT
  gb.id               AS batch_id,
  gb.order_id,
  gb.customer_id,
  c.name              AS customer_name,
  gb.product_id,
  p.name              AS product_name,

  gb.quantity_received,
  gb.quantity_remaining,
  gb.quantity_unit,
  gb.received_date,

  (CURRENT_DATE - gb.received_date)  AS days_in_godown,

  CASE
    WHEN (CURRENT_DATE - gb.received_date) >=
         (SELECT (value #>> '{}')::int FROM app_settings WHERE key = 'godown_aging_alert_days')
      THEN 'CRITICAL'
    WHEN (CURRENT_DATE - gb.received_date) >=
         (SELECT (value #>> '{}')::int FROM app_settings WHERE key = 'godown_aging_warning_days')
      THEN 'WARNING'
    ELSE 'NORMAL'
  END AS aging_status,

  o.order_number,
  o.status            AS order_status,
  o.total_amount      AS order_value

FROM godown_batches gb
  JOIN customers c ON c.id = gb.customer_id
  JOIN orders    o ON o.id = gb.order_id
  LEFT JOIN products p ON p.id = gb.product_id

WHERE gb.quantity_remaining > 0;


-- ----------------------------------------------------------------
-- 3. Godown summary per customer
--    (total stock sitting, total days, total value locked)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_godown_by_customer AS
SELECT
  gb.customer_id,
  c.name              AS customer_name,

  COUNT(*)                          AS batch_count,
  SUM(gb.quantity_remaining)        AS total_quantity_sitting,
  MIN(gb.received_date)             AS oldest_batch_date,
  MAX(CURRENT_DATE - gb.received_date) AS max_days_sitting,

  SUM(
    CASE WHEN (CURRENT_DATE - gb.received_date) >=
         (SELECT (value #>> '{}')::int FROM app_settings WHERE key = 'godown_aging_alert_days')
    THEN gb.quantity_remaining ELSE 0 END
  ) AS critical_quantity

FROM godown_batches gb
  JOIN customers c ON c.id = gb.customer_id
WHERE gb.quantity_remaining > 0
GROUP BY gb.customer_id, c.name;


-- ----------------------------------------------------------------
-- 4. Pending deliveries per order
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_pending_deliveries AS
SELECT
  o.id                AS order_id,
  o.order_number,
  o.customer_id,
  c.name              AS customer_name,
  o.product_id,
  p.name              AS product_name,

  o.quantity_ordered,
  COALESCE(del.total_delivered, 0) AS total_delivered,
  (o.quantity_ordered - COALESCE(del.total_delivered, 0)) AS pending_quantity,
  o.quantity_unit,

  o.total_amount      AS order_value,
  o.order_date,
  o.status,

  COALESCE(gd.in_godown, 0) AS quantity_in_godown,

  -- Can we fulfil from what is in godown right now?
  CASE
    WHEN COALESCE(gd.in_godown, 0) >=
         (o.quantity_ordered - COALESCE(del.total_delivered, 0))
    THEN true
    ELSE false
  END AS can_fulfil_from_godown

FROM orders o
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN products p ON p.id = o.product_id

  LEFT JOIN (
    SELECT order_id, SUM(quantity_delivered) AS total_delivered
    FROM deliveries
    GROUP BY order_id
  ) del ON del.order_id = o.id

  LEFT JOIN (
    SELECT order_id, SUM(quantity_remaining) AS in_godown
    FROM godown_batches
    WHERE quantity_remaining > 0
    GROUP BY order_id
  ) gd ON gd.order_id = o.id

WHERE o.deleted_at IS NULL
  AND o.status NOT IN ('CLOSED')
  AND (o.quantity_ordered - COALESCE(del.total_delivered, 0)) > 0;


-- ----------------------------------------------------------------
-- 5. Lorry tracker (active + overdue)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_lorry_tracker AS
SELECT
  l.id                AS lorry_id,
  l.lr_number,
  l.transporter_name,
  l.transporter_phone,
  l.vehicle_number,
  l.status,

  l.dispatch_date,
  l.expected_arrival_date,
  l.actual_arrival_date,
  l.lorry_office_name,
  l.tempo_booked,
  l.freight_cost,
  l.freight_paid,

  CASE
    WHEN l.status = 'RECEIVED_IN_GODOWN'
      THEN 'COMPLETED'
    WHEN l.expected_arrival_date < CURRENT_DATE
         AND l.actual_arrival_date IS NULL
      THEN 'OVERDUE'
    WHEN l.expected_arrival_date = CURRENT_DATE
      THEN 'ARRIVING_TODAY'
    WHEN l.status = 'ARRIVED_AT_OFFICE' AND l.tempo_booked = false
      THEN 'NEEDS_TEMPO'
    ELSE 'ON_TRACK'
  END AS tracking_status,

  CASE
    WHEN l.expected_arrival_date IS NOT NULL
         AND l.actual_arrival_date IS NULL
         AND l.expected_arrival_date < CURRENT_DATE
    THEN (CURRENT_DATE - l.expected_arrival_date)
    ELSE 0
  END AS days_overdue,

  -- Manifest summary
  manifest.item_count,
  manifest.total_weight_kg,
  manifest.customer_names,
  manifest.order_numbers

FROM lorries l

LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                             AS item_count,
    SUM(li.weight_kg)                    AS total_weight_kg,
    STRING_AGG(DISTINCT c.name, ', ')    AS customer_names,
    STRING_AGG(DISTINCT o.order_number::text, ', ') AS order_numbers
  FROM lorry_items li
    JOIN customers c ON c.id = li.customer_id
    JOIN orders    o ON o.id = li.order_id
  WHERE li.lorry_id = l.id
) manifest ON true;


-- ----------------------------------------------------------------
-- 6. Stuck orders (sitting too long in one stage)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_stuck_orders AS
SELECT
  o.id                AS order_id,
  o.order_number,
  o.customer_id,
  c.name              AS customer_name,
  p.name              AS product_name,
  o.status,
  o.status_changed_at,

  EXTRACT(DAY FROM now() - o.status_changed_at)::int AS days_in_current_stage,

  o.quantity_ordered,
  o.quantity_unit,
  o.total_amount,
  o.order_date

FROM orders o
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN products p ON p.id = o.product_id

WHERE o.deleted_at IS NULL
  AND o.status NOT IN ('FULLY_DELIVERED', 'CLOSED')
  AND EXTRACT(DAY FROM now() - o.status_changed_at) >=
      (SELECT (value #>> '{}')::int FROM app_settings WHERE key = 'order_stuck_warning_days');


-- ----------------------------------------------------------------
-- 7. Design pipeline
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_design_pipeline AS
SELECT
  d.id                AS design_id,
  d.order_id,
  o.order_number,
  d.version_number,
  d.status,

  o.customer_id,
  c.name              AS customer_name,
  p.name              AS product_name,

  d.created_at        AS design_created_at,
  d.sent_for_approval_at,
  d.approved_at,

  EXTRACT(DAY FROM now() - d.created_at)::int AS days_since_created,

  CASE
    WHEN d.status = 'REVISION_REQUIRED' THEN 'ACTION_NEEDED'
    WHEN d.status IN ('PENDING', 'IN_PROGRESS')
         AND EXTRACT(DAY FROM now() - d.created_at) > 5
      THEN 'SLOW'
    ELSE 'ON_TRACK'
  END AS pipeline_status

FROM designs d
  JOIN orders    o ON o.id = d.order_id
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN products p ON p.id = o.product_id

WHERE d.status NOT IN ('SENT_TO_PRINT');


-- ----------------------------------------------------------------
-- 8. Payment follow-up list
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_payment_followup AS
SELECT
  co.customer_id,
  co.customer_name,
  co.phone,
  co.whatsapp_number,
  co.outstanding_amount,
  co.days_since_last_payment,
  co.last_payment_date,
  co.active_orders,
  co.total_invoiced,
  co.total_paid,

  CASE
    WHEN co.days_since_last_payment IS NULL THEN 'NEVER_PAID'
    WHEN co.days_since_last_payment >=
         (SELECT (value #>> '{}')::int FROM app_settings WHERE key = 'payment_overdue_alert_days')
      THEN 'CRITICAL'
    WHEN co.days_since_last_payment >=
         (SELECT (value #>> '{}')::int FROM app_settings WHERE key = 'payment_overdue_warning_days')
      THEN 'WARNING'
    ELSE 'NORMAL'
  END AS followup_urgency

FROM v_customer_outstanding co
WHERE co.outstanding_amount > 0
ORDER BY
  CASE
    WHEN co.days_since_last_payment IS NULL THEN 0
    ELSE co.days_since_last_payment
  END DESC,
  co.outstanding_amount DESC;


-- ----------------------------------------------------------------
-- 9. Customer ledger  (chronological transaction list)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_customer_ledger AS

-- Invoices (orders)
SELECT
  o.customer_id,
  o.order_date       AS txn_date,
  'INVOICE'          AS txn_type,
  o.id               AS ref_id,
  ('Order #' || o.order_number)  AS description,
  o.total_amount     AS debit,          -- customer owes us
  0                  AS credit,
  o.created_at       AS sort_ts
FROM orders o
WHERE o.deleted_at IS NULL
  AND o.is_historical = false

UNION ALL

-- Payments
SELECT
  p.customer_id,
  p.payment_date     AS txn_date,
  'PAYMENT'          AS txn_type,
  p.id               AS ref_id,
  (p.payment_mode::text || COALESCE(' - ' || p.reference_number, '')) AS description,
  0                  AS debit,
  p.amount           AS credit,         -- customer paid us
  p.created_at       AS sort_ts
FROM payments p
WHERE p.is_historical = false

ORDER BY txn_date ASC, sort_ts ASC;


-- ----------------------------------------------------------------
-- 10. Dashboard summary  (single-row overview)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_dashboard AS
SELECT
  -- Orders
  (SELECT COUNT(*) FROM orders
   WHERE status NOT IN ('FULLY_DELIVERED', 'CLOSED')
     AND deleted_at IS NULL
     AND is_historical = false
  ) AS active_orders,

  (SELECT COUNT(*) FROM orders
   WHERE status = 'ORDER_RECEIVED'
     AND deleted_at IS NULL
  ) AS new_orders,

  -- Designs
  (SELECT COUNT(*) FROM designs
   WHERE status IN ('PENDING', 'IN_PROGRESS', 'SENT_FOR_APPROVAL', 'REVISION_REQUIRED')
  ) AS pending_designs,

  -- Print jobs
  (SELECT COUNT(*) FROM print_jobs
   WHERE status IN ('ORDER_PLACED', 'IN_PRODUCTION')
  ) AS active_print_jobs,

  -- Lorries
  (SELECT COUNT(*) FROM lorries
   WHERE status NOT IN ('RECEIVED_IN_GODOWN')
  ) AS active_lorries,

  (SELECT COUNT(*) FROM lorries
   WHERE expected_arrival_date < CURRENT_DATE
     AND actual_arrival_date IS NULL
     AND status NOT IN ('RECEIVED_IN_GODOWN')
  ) AS overdue_lorries,

  -- Godown
  (SELECT COUNT(*) FROM godown_batches
   WHERE quantity_remaining > 0
  ) AS godown_batch_count,

  (SELECT COALESCE(SUM(quantity_remaining), 0) FROM godown_batches
   WHERE quantity_remaining > 0
  ) AS total_godown_stock_kg,

  (SELECT COUNT(*) FROM godown_batches
   WHERE quantity_remaining > 0
     AND (CURRENT_DATE - received_date) >=
         (SELECT (value #>> '{}')::int FROM app_settings WHERE key = 'godown_aging_alert_days')
  ) AS godown_aging_alerts,

  -- Payments
  (SELECT COALESCE(SUM(outstanding_amount), 0)
   FROM v_customer_outstanding
   WHERE outstanding_amount > 0
  ) AS total_outstanding,

  (SELECT COUNT(*)
   FROM v_customer_outstanding
   WHERE outstanding_amount > 0
     AND days_since_last_payment >=
         (SELECT (value #>> '{}')::int FROM app_settings WHERE key = 'payment_overdue_alert_days')
  ) AS payment_critical_count,

  -- Pending deliveries
  (SELECT COUNT(*) FROM v_pending_deliveries) AS orders_pending_delivery,

  (SELECT COUNT(*) FROM v_pending_deliveries
   WHERE can_fulfil_from_godown = true
  ) AS orders_ready_to_deliver;


-- ================================================================
-- SUPABASE: Enable Realtime on key tables
-- ================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE lorries;
ALTER PUBLICATION supabase_realtime ADD TABLE godown_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE designs;
ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;


-- ================================================================
-- SUPABASE: Enable Row Level Security
-- (Basic single-user setup; expand when multi-user is needed)
-- ================================================================

ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lorries             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lorry_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_batches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings        ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (single-business setup)
CREATE POLICY "Authenticated users have full access" ON customers
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON products
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON orders
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON designs
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON printers
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON print_jobs
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON lorries
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON lorry_items
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON godown_batches
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON deliveries
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON delivery_items
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON payments
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON order_status_history
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON activity_log
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users have full access" ON app_settings
  FOR ALL USING (auth.role() = 'authenticated');
