# Smart Packaging Hub

## Complete Project Documentation

**Version:** 1.0
**Date:** October 2026
**Author:** Jaiyantan
**Status:** Design & Architecture Complete

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Business Context](#2-business-context)
3. [Current State: Pain Points](#3-current-state-pain-points)
4. [Solution Overview](#4-solution-overview)
5. [Technology Stack](#5-technology-stack)
6. [System Architecture](#6-system-architecture)
7. [Business Workflow & Lifecycle](#7-business-workflow--lifecycle)
8. [Feature Specifications](#8-feature-specifications)
9. [Database Schema](#9-database-schema)
10. [Intelligence Layer](#10-intelligence-layer)
11. [UI/UX Design](#11-uiux-design)
12. [Historical Data Migration Strategy](#12-historical-data-migration-strategy)
13. [Real-time & Sync Architecture](#13-real-time--sync-architecture)
14. [Implementation Roadmap](#14-implementation-roadmap)
15. [Glossary](#15-glossary)

---

## 1. Project Vision

Build a **Palantir-style operational intelligence console** for a flexible packaging supply business based in Chennai. The system transforms a paper-driven, WhatsApp-scattered workflow into a single application that provides complete visibility across the entire order-to-payment lifecycle.

**Core principle:** The business operator should carry the **least possible mental load**. Every piece of information he currently tracks in his head, in notebooks, or across WhatsApp threads should be accessible in one place, surfaced proactively when it needs attention, with zero effort to maintain.

### Success Criteria

- Every order's current stage is visible at a glance, from receipt through delivery and payment collection.
- Overdue lorries, aging godown stock, stuck orders, and late payments surface automatically as color-coded alerts.
- Historical paper records are migrated into the system without distorting ongoing financials.
- The system works seamlessly on a desktop at the office and on mobile when the operator is on the move.
- Data entry is fast and minimal, designed for someone who is managing operations, not sitting at a computer.

---

## 2. Business Context

### Industry

Flexible packaging manufacturing and supply. The business produces flexible packaging covers (pouches, wrappers, laminates) used by FMCG companies. Think of the printed plastic pouch that holds a bag of chips, a packet of masala, or a jar of pickle. These are custom-printed, made to order, and delivered in bulk.

### Geography & Supply Chain

The business operates across two cities:

- **Chennai (Tamil Nadu):** The home base. Sales, customer relationships, warehouse (godown), and delivery operations all happen here. Customers are FMCG manufacturers in and around Chennai.
- **Delhi:** Printing happens here. Approved designs are sent to printing partners in Delhi who produce the packaging material on industrial presses.

The supply chain bridge between these two cities is **lorry transport**: printed goods are loaded onto lorries in Delhi, travel to Chennai over several days, arrive at a lorry office (transport depot), and are then picked up via a local tempo and brought to the godown (warehouse) in Chennai.

### Customer Profile

Customers are small-to-medium FMCG companies: snack brands, chips manufacturers, groundnut roasters, pickle makers, masala blenders. They place repeat orders for packaging covers, often for multiple products. Payments are made at the customer level (not per order), typically via RTGS, NEFT, UPI, or GPay, and often in lump sums that cover multiple invoices at once.

### Team

Currently a small operation run primarily by the business owner with minimal staff. The system is designed for single-user operation with the architecture to support multiple users later.

---

## 3. Current State: Pain Points

### How It Works Today

| Step | Current Method | Problem |
|------|---------------|---------|
| Order received | Phone call or WhatsApp, noted in a register | No central list; easy to forget or lose details |
| Design created/approved | Files shared over WhatsApp | Version confusion; approvals are verbal |
| Sent to Delhi printer | Phone call to printer | No tracking of print job status |
| Lorry dispatch from Delhi | LR number noted on paper; status checked by phone | Shipments go missing for days; no overdue alerting |
| Arrived at lorry office | Phone call notification | Tempo booking for pickup is frequently forgotten |
| Received in godown | Paper entry in register | No aging visibility; stock sits for weeks undelivered |
| Delivered to customer | Challan book entry | Partial deliveries not tracked accurately |
| Payment collected | Separate payment register | Outstanding amounts are guesswork; follow-ups are ad hoc |

### Key Problems

1. **Data silos everywhere.** Information is spread across paper registers, WhatsApp chats, phone memories, and mental notes. No single source of truth exists.
2. **No proactive alerting.** The operator discovers problems only when he mentally reviews everything or when a customer complains. Lorries go overdue, stock ages in the godown, payments drift, and no alarm sounds.
3. **Payment tracking is guesswork.** Since customers pay at the customer level (not per invoice) and payments arrive via multiple modes, reconciling who owes what requires flipping through registers and doing arithmetic manually.
4. **Partial deliveries create confusion.** When a customer takes 500kg out of a 1000kg order, tracking what remains, where it is sitting, and for how long is nearly impossible with paper records.
5. **Historical records are buried.** Years of transactions exist only on paper. There is no way to query historical patterns, customer behavior, or outstanding balances without digging through registers.
6. **High mental load.** The owner carries the state of the entire business in his head. This is unsustainable and error-prone.

---

## 4. Solution Overview

### Smart Packaging Hub

A custom web application that serves as the operational nervous system of the business. It is not a generic ERP or accounting tool. It is purpose-built for this specific business workflow, from order intake through packaging design, Delhi printing, lorry transit, godown management, customer delivery, and payment collection.

### Seven Core Modules

| # | Module | What It Manages |
|---|--------|-----------------|
| 1 | **Order Command Center** | Complete order lifecycle from receipt to closure, status tracking through 13 stages |
| 2 | **Design Pipeline** | Design versions, customer approval cycles, handoff to print |
| 3 | **Print Management** | Jobs sent to Delhi printers, production tracking, dispatch status |
| 4 | **Lorry Transit Tracker** | Shipments from Delhi to Chennai, ETA monitoring, overdue alerts, manifest tracking |
| 5 | **Godown Intelligence** | Warehouse inventory with aging analysis, batch-level traceability, stock allocation |
| 6 | **Delivery Management** | Full and partial deliveries, godown batch drawdown, challan generation |
| 7 | **Payment & Ledger** | Customer-level payments, outstanding calculation, transaction ledger, follow-up prioritization |

### The Intelligence Layer

On top of the transactional modules sits an intelligence layer: 10 PostgreSQL views and a dashboard that continuously compute the state of the business. These are not reports to be generated on demand; they are live computed views that answer questions like:

- Which lorries are overdue?
- Which godown stock is aging past the warning threshold?
- Which orders are stuck in one stage for too long?
- Which customers have the highest outstanding, and when did they last pay?
- Which orders are ready to deliver right now because godown stock is sufficient?

---

## 5. Technology Stack

### Chosen Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend Framework** | Next.js (React) | Server-side rendering for initial load, file-based routing, API routes for backend logic |
| **Database** | PostgreSQL via Supabase | Managed Postgres with built-in auth, storage, realtime subscriptions, and REST/GraphQL APIs |
| **ORM** | Prisma | Type-safe database client, schema-as-code, migration management, nested reads/writes, transactions |
| **UI Components** | shadcn/ui (Tailwind CSS) | Accessible, customizable components that look professional without a design team |
| **State Management** | React Query (TanStack Query) | Server state caching, background refetching, optimistic updates, stale-while-revalidate |
| **Real-time** | Supabase Realtime (WebSockets) | Push-based updates when data changes, enabling cross-device sync without polling |
| **Background Jobs** | node-cron | Lightweight in-process scheduling for daily alerts, threshold checks, cleanup tasks |
| **Hosting** | Vercel | Zero-config deployment for Next.js, serverless functions, edge network |

### Why This Stack

- **Supabase** eliminates the need to manage a database server, set up authentication, or build a file upload system. It gives PostgreSQL with a REST API, auth, and realtime out of the box.
- **Prisma** solves the object-relationship challenge in Node.js. Complex queries involving orders with their customers, products, designs, print jobs, lorry items, and godown batches are expressed as nested includes, not raw SQL joins.
- **React Query** handles the dynamic update problem. When a lorry status changes, React Query's cache invalidation ensures every component showing that lorry re-renders with fresh data. Combined with Supabase Realtime, changes made on one device appear on another without refreshing.
- **shadcn/ui** provides a professional, consistent UI without needing a dedicated designer. Components are accessible, responsive, and easily customizable.

### Architecture Decisions

**Intelligence Layer lives in PostgreSQL, not in application code.** Views like `v_godown_aging`, `v_lorry_tracker`, and `v_payment_followup` compute their results directly from the data using SQL. This means the intelligence is always consistent, always up to date, and works regardless of which client is querying.

**node-cron for background jobs, not a separate job queue.** The scale of this business does not justify Redis + Bull or a similar setup. A simple cron running in the Next.js process handles daily checks for overdue lorries, aging godown stock, and payment follow-up reminders.

**Prisma transactions for cascading writes.** When a delivery is recorded, it must simultaneously create the delivery record, create delivery_items linking to specific godown batches, decrement the godown batch quantities, and potentially update the order status. Prisma's interactive transactions guarantee these either all succeed or all roll back.

---

## 6. System Architecture

### High-Level Architecture

```
+---------------------------------------------+
|              CLIENT (Browser)                |
|  Next.js App (React + shadcn/ui)             |
|  React Query (cache/state) + Supabase RT     |
+---------------------------------------------+
          |             |              |
          v             v              v
+-------------------+  +-------------------+
| Next.js API       |  | Supabase          |
| Routes            |  | Realtime          |
| (Prisma ORM)      |  | (WebSocket)       |
+-------------------+  +-------------------+
          |                     |
          v                     v
+---------------------------------------------+
|           PostgreSQL (Supabase)              |
|                                             |
|  14 Tables | 7 Enums | 2 Triggers           |
|  10 Intelligence Views | 25+ Indexes        |
+---------------------------------------------+
```

### Data Flow Pattern

1. **User action** (e.g., updates lorry status to "Arrived at Office") fires a mutation via React Query.
2. **Optimistic update** immediately reflects the change in the UI.
3. **API route** receives the request, runs the update through Prisma (with any cascading logic in a transaction).
4. **PostgreSQL** stores the change, triggers fire (e.g., `fn_log_order_status` logs the transition), and views recompute.
5. **Supabase Realtime** broadcasts the table change via WebSocket.
6. **Other connected clients** (e.g., mobile) receive the broadcast, React Query invalidates the affected cache, and the UI re-renders.

### Background Job Layer

```
node-cron (runs inside Next.js process)
  |
  +-- Daily 6:00 AM: Check for overdue lorries, generate alerts
  +-- Daily 6:00 AM: Check godown aging, flag batches past threshold
  +-- Daily 8:00 AM: Generate payment follow-up list
  +-- Weekly: Cleanup old activity_log entries
```

---

## 7. Business Workflow & Lifecycle

### Complete Order Lifecycle (13 Stages)

```
ORDER_RECEIVED
    |
DESIGN_PENDING --> DESIGN_IN_PROGRESS --> DESIGN_APPROVED
    |
SENT_TO_PRINT --> PRINTING --> PRINT_DISPATCHED
    |
IN_TRANSIT --> ARRIVED_AT_LORRY_OFFICE
    |
RECEIVED_IN_GODOWN
    |
PARTIALLY_DELIVERED (repeatable)
    |
FULLY_DELIVERED --> CLOSED
```

### Stage-by-Stage Detail

**Stage 1: ORDER_RECEIVED**
Customer places an order (phone, WhatsApp, in person). The operator creates the order record with customer, product, quantity, rate, and expected delivery date.

**Stage 2: DESIGN_PENDING**
If the order needs a new design or design revision, it moves here. A design record is created with version tracking.

**Stage 3: DESIGN_IN_PROGRESS**
The design is being worked on. File uploads track design files. Internal notes capture design decisions.

**Stage 4: DESIGN_APPROVED**
The customer has approved the design. The approval date and approver name are recorded. The design is locked.

**Stage 5: SENT_TO_PRINT**
The approved design and print specifications are sent to a Delhi printer. A print_job record is created, capturing material specs, quantity, and the printer assignment.

**Stage 6: PRINTING**
The print job is in production at the Delhi printer. Status is tracked via the print_job_status enum.

**Stage 7: PRINT_DISPATCHED**
The printer has dispatched the finished goods. The actual dispatch date is recorded on the print job.

**Stage 8: IN_TRANSIT**
A lorry has been booked and the goods are on the road from Delhi to Chennai. A lorry record is created with LR number, transporter details, and expected arrival date. Lorry_items link the lorry to specific orders, customers, and products (a single lorry often carries goods for multiple customers/orders).

**Stage 9: ARRIVED_AT_LORRY_OFFICE**
The lorry has arrived at the transport depot in Chennai. Now a local tempo must be arranged to pick up the goods and bring them to the godown. The system flags lorries that have arrived but do not have a tempo booked (tracking_status = "NEEDS_TEMPO").

**Stage 10: RECEIVED_IN_GODOWN**
Goods are physically in the warehouse. A godown_batch record is created for each distinct order/product received, with full traceability back to the lorry, lorry_item, order, customer, and product. The aging clock starts.

**Stage 11: PARTIALLY_DELIVERED**
The customer takes a portion of their order. A delivery record is created with delivery_items that specify exactly which godown batches the stock was drawn from. The godown batch quantities are decremented accordingly.

**Stage 12: FULLY_DELIVERED**
All ordered quantity has been delivered. This is either reached through successive partial deliveries or a single full delivery.

**Stage 13: CLOSED**
The order is complete. All goods delivered, all paperwork finalized. This is the terminal state.

### Payment Flow (Runs Parallel to Order Lifecycle)

Payments are decoupled from individual orders. A customer may owe across multiple orders and pay in a lump sum.

```
Customer Outstanding = Opening Balance + Total Invoiced (non-historical) - Total Paid (non-historical)
```

Payment records capture: amount, date, payment mode (RTGS/NEFT/Cash/GPay/UPI/Cheque), reference number, and bank name. The system generates a chronological customer ledger (v_customer_ledger) showing invoices and payments interleaved by date.

---

## 8. Feature Specifications

### 8.1 Dashboard (Home Screen)

A single-screen operational overview showing KPIs computed by the `v_dashboard` view:

| KPI | Source | Alert Condition |
|-----|--------|----------------|
| Active Orders | Count of orders not in FULLY_DELIVERED or CLOSED | None (informational) |
| New Orders | Orders in ORDER_RECEIVED | Highlight if > 0 |
| Pending Designs | Designs in PENDING, IN_PROGRESS, SENT_FOR_APPROVAL, or REVISION_REQUIRED | Highlight if REVISION_REQUIRED > 0 |
| Active Print Jobs | Print jobs in ORDER_PLACED or IN_PRODUCTION | None |
| Active Lorries | Lorries not in RECEIVED_IN_GODOWN | None |
| Overdue Lorries | Lorries past expected arrival with no actual arrival | Red alert |
| Godown Stock | Total quantity sitting in godown | None |
| Godown Aging Alerts | Batches past the alert threshold (default 30 days) | Red alert |
| Total Outstanding | Sum of all customer outstanding amounts | None |
| Payment Alerts | Customers past the critical threshold (default 60 days since last payment) | Red alert |
| Orders Pending Delivery | Orders with undelivered quantity | None |
| Ready to Deliver | Orders where godown stock is sufficient to fulfill remaining quantity | Green highlight (actionable) |

### 8.2 Order Command Center

**List View:** Filterable, sortable table of all orders with:
- Order number (auto-generated)
- Customer name
- Product name
- Quantity ordered / delivered / pending
- Current status with color-coded badge
- Days in current stage (color-coded: normal/warning/critical)
- Order value

**Detail View (Sliding Panel):**
- Complete order information
- Status timeline showing all transitions with dates (from order_status_history)
- Linked design (version, status, approval date)
- Linked print job (printer, status, dispatch date)
- Linked lorry items (lorry LR number, transit status)
- Godown batches received against this order
- Deliveries made against this order
- Quick-action buttons for status progression

**Stuck Orders Alert:** Orders flagged by `v_stuck_orders` when they exceed the configurable threshold (default 7 days) in any single stage.

### 8.3 Design Pipeline

**Pipeline View (Kanban-style):** Columns for each design status:
- PENDING
- IN_PROGRESS
- SENT_FOR_APPROVAL
- REVISION_REQUIRED
- APPROVED

Each card shows: customer name, product, version number, days since created, and pipeline status indicator (ON_TRACK / SLOW / ACTION_NEEDED).

**Detail View:**
- Design file preview/download
- Version history (multiple design records per order)
- Customer feedback notes
- Approval tracking (date, approved by)
- Direct link to parent order

### 8.4 Print Management

**Active Jobs View:** List of print jobs grouped by printer, showing:
- Order and customer details
- Material specifications (type, dimensions, color count)
- Quantity and cost
- Key dates: sent, expected dispatch, actual dispatch
- Status badge

**Printer Directory:** Master list of Delhi printing partners with contact details and job history.

### 8.5 Lorry Transit Tracker

**Map-style Tracker View:** Active lorries with:
- LR number and transporter details
- Tracking status badge (ON_TRACK / ARRIVING_TODAY / OVERDUE / NEEDS_TEMPO / COMPLETED)
- Days overdue (if applicable)
- Manifest summary (item count, total weight, customer names, order numbers)
- Key dates: dispatch, ETA, actual arrival

**Overdue Alerts:** Lorries past their ETA are highlighted in red with days overdue count. Lorries that have arrived at the office but lack a tempo booking are flagged separately.

**Manifest Detail:** Expandable view showing every item on the lorry, linked to its order and customer.

### 8.6 Godown Intelligence

**Stock Overview:** Three categories of stock:

1. **Allocated, awaiting partial delivery** - Stock with remaining quantity tied to orders that have already had partial deliveries.
2. **Received, delivery not yet started** - Stock from orders that have not had any deliveries yet.
3. **Free stock** - Stock where the full order quantity has been delivered but excess was received (rare but possible).

**Aging View (from v_godown_aging):** Each batch shows:
- Customer and product
- Quantity remaining
- Days in godown
- Color-coded aging status:
  - **Green (NORMAL):** Under warning threshold (default < 15 days)
  - **Yellow (WARNING):** Past warning threshold (default 15-29 days)
  - **Red (CRITICAL):** Past alert threshold (default >= 30 days)

**Customer Aggregate (from v_godown_by_customer):** Per-customer summary showing total stock sitting, oldest batch date, max days, and critical quantity.

### 8.7 Delivery Management

**Delivery Creation Flow:**
1. Select order
2. System shows available godown batches for that order with quantities
3. Enter delivery quantity
4. System auto-suggests batch allocation (FIFO by received date, oldest first)
5. Record delivery mode, vehicle, receiver name
6. On save: delivery created, delivery_items link to batches, batch quantities decremented (in a Prisma transaction), order status updated if fully delivered

**Delivery History:** Chronological list per order and per customer, with challan numbers.

### 8.8 Payment & Ledger

**Payment Recording:**
- Select customer
- Enter amount, date, payment mode
- Enter reference number (UTR for RTGS, transaction ID for GPay)
- Optional: bank name, notes

**Customer Outstanding (from v_customer_outstanding):**
- Opening balance (migrated from paper records)
- Total invoiced (non-historical orders)
- Total paid (non-historical payments)
- Outstanding = opening + invoiced - paid
- Days since last payment

**Payment Follow-up (from v_payment_followup):**
Priority-sorted list of customers with outstanding amounts:
- **NORMAL:** Recent payment, within thresholds
- **WARNING:** Past warning threshold (default 30 days since last payment)
- **CRITICAL:** Past alert threshold (default 60 days since last payment)
- **NEVER_PAID:** Customer has never made a payment

**Customer Ledger (from v_customer_ledger):**
Chronological transaction list showing invoices (debits) and payments (credits), interleaved by date. This is the view the operator can share with customers via WhatsApp for payment reconciliation.

### 8.9 Customer Management

**Customer Profile:**
- Company details: name, type (SNACKS/CHIPS/GROUNDNUT/PICKLE/MASALA/FMCG_OTHER/OTHER), GST number
- Contact: person, phone (primary + secondary), email, WhatsApp number
- Address: line 1, line 2, city, state, pincode
- Opening balance (amount + effective date) for historical migration
- Activity: active order count, total outstanding, last payment date
- Soft delete support (deleted_at) for historical integrity

**Product Catalog (per customer):**
Each customer has their own set of products/SKUs with:
- SKU code, name, description
- Print specifications: material type, dimensions, thickness, color count
- Default pricing: rate and unit (per kg / per piece / per roll)

### 8.10 Settings & Configuration

**Configurable Thresholds (stored in app_settings):**

| Setting | Default | Purpose |
|---------|---------|---------|
| system_start_date | 2026-10-01 | Cutoff between historical and live records |
| godown_aging_warning_days | 15 | Days before yellow warning on godown stock |
| godown_aging_alert_days | 30 | Days before red alert on godown stock |
| payment_overdue_warning_days | 30 | Days since last payment before warning |
| payment_overdue_alert_days | 60 | Days since last payment before critical alert |
| lorry_overdue_days | 2 | Days past ETA before lorry shows as overdue |
| order_stuck_warning_days | 7 | Days in one stage before order flagged as stuck |

---

## 9. Database Schema

### Overview

- **7 Enums** defining valid states across the system
- **14 Tables** covering every entity in the business workflow
- **2 Triggers** for automatic timestamp management and status change logging
- **25+ Indexes** including partial indexes for performance on active-record queries
- **10 Views** forming the intelligence layer

### Enum Definitions

| Enum | Values | Used By |
|------|--------|---------|
| company_type | SNACKS, CHIPS, GROUNDNUT, PICKLE, MASALA, FMCG_OTHER, OTHER | customers |
| order_status | ORDER_RECEIVED through CLOSED (13 stages) | orders |
| design_status | PENDING through SENT_TO_PRINT (6 stages) | designs |
| print_job_status | ORDER_PLACED through DISPATCHED (4 stages) | print_jobs |
| lorry_status | BOOKED through RECEIVED_IN_GODOWN (7 stages) | lorries |
| payment_mode | RTGS, NEFT, CASH, GPAY, UPI_OTHER, CHEQUE | payments |
| delivery_type | FULL, PARTIAL | deliveries |

### Table Relationships

```
customers
  |-- products (1:N)
  |-- orders (1:N)
  |     |-- order_status_history (1:N, auto-populated by trigger)
  |     |-- designs (1:N, versioned)
  |     |-- print_jobs (1:N)
  |     |-- lorry_items (N:M via lorry_items)
  |     |-- godown_batches (1:N)
  |     |-- deliveries (1:N)
  |           |-- delivery_items (1:N) --> godown_batches
  |
  |-- payments (1:N, at customer level)
  |-- lorry_items (1:N)

lorries
  |-- lorry_items (1:N, manifest)

printers
  |-- print_jobs (1:N)

app_settings (standalone config)
activity_log (standalone audit trail)
```

### Key Design Decisions

**UUIDs for primary keys.** Every table uses UUID primary keys (`gen_random_uuid()`). This supports offline-first data entry, client-side ID generation, and avoids sequential ID guessing.

**BIGINT GENERATED ALWAYS AS IDENTITY for human-readable numbers.** `orders.order_number` and `deliveries.challan_number` are auto-incrementing integers for customer-facing reference, while the primary key remains a UUID.

**Soft deletes on customers and orders.** A `deleted_at` timestamp allows logical deletion while preserving referential integrity for historical reporting.

**quantity_remaining with CHECK constraint.** `godown_batches.quantity_remaining` has a `CHECK (quantity_remaining >= 0)` constraint, making it impossible for the application to over-draw stock from a batch. The database enforces inventory integrity.

**Payments at customer level.** The payments table references `customer_id`, not `order_id`. This matches the real-world pattern where customers pay in lump sums across multiple orders.

**is_historical flag.** Orders, godown batches, deliveries, and payments all carry an `is_historical` boolean. Historical records are entered for record-keeping but are excluded from financial calculations (outstanding amounts are computed only from non-historical records). The customer's `opening_balance_amount` captures the net financial position as of the system start date.

### Triggers

**fn_set_updated_at():** Applied to all tables with an `updated_at` column. Automatically sets `updated_at = now()` on every UPDATE, removing the need for application code to manage timestamps.

**fn_log_order_status():** Fires BEFORE UPDATE on the orders table. When the status column changes, it:
1. Sets `status_changed_at = now()` on the order (used by the "days in current stage" calculation).
2. Inserts a row into `order_status_history` recording old_status, new_status, and timestamp.

This gives a complete audit trail of every status transition with zero effort from the application layer.

### Indexes

The schema includes 25+ indexes, with several notable patterns:

**Partial indexes for active records:** Instead of indexing all orders by status, `idx_orders_open` only indexes orders that are not FULLY_DELIVERED or CLOSED and have not been soft-deleted. This keeps the index small and fast for the most common query pattern (showing active orders).

**Partial indexes for godown stock:** `idx_godown_has_stock` indexes only batches where `quantity_remaining > 0`, making the "what's in godown right now" query fast regardless of how many fully-depleted historical batches exist.

**Composite indexes for common joins:** `idx_orders_open` covers `(status, customer_id)` for the frequent "active orders for this customer" query.

### Full Schema File

The complete SQL schema is provided as a separate file: `smart-packaging-hub-schema.sql`. It can be run directly in the Supabase SQL Editor to create the entire database structure.

---

## 10. Intelligence Layer

The intelligence layer consists of 10 PostgreSQL views that compute operational insights directly from the data. These views are not materialized; they compute fresh results on every query, ensuring the dashboard always reflects the current state.

### View Catalog

#### v_customer_outstanding
**Purpose:** Calculate each customer's current outstanding balance.
**Formula:** `Outstanding = Opening Balance + Total Invoiced (non-historical) - Total Paid (non-historical)`
**Key fields:** customer_id, outstanding_amount, days_since_last_payment, active_orders
**Used by:** Dashboard total outstanding, payment follow-up list, customer profile

#### v_godown_aging
**Purpose:** Show every godown batch with stock remaining, annotated with aging status.
**Logic:** Compares `(CURRENT_DATE - received_date)` against configurable thresholds from app_settings.
**Categories:** NORMAL (< warning days), WARNING (>= warning, < alert), CRITICAL (>= alert days)
**Key fields:** batch_id, days_in_godown, aging_status, customer_name, product_name, quantity_remaining

#### v_godown_by_customer
**Purpose:** Aggregate godown stock per customer for the summary view.
**Key fields:** customer_id, total_quantity_sitting, max_days_sitting, critical_quantity, oldest_batch_date

#### v_pending_deliveries
**Purpose:** Show orders with undelivered quantity and whether godown stock is sufficient to fulfill them.
**Logic:** `pending_quantity = quantity_ordered - total_delivered`. Cross-references with godown stock for that order.
**Key fields:** order_id, pending_quantity, quantity_in_godown, can_fulfil_from_godown (boolean)

#### v_lorry_tracker
**Purpose:** Compute tracking status for every lorry.
**Categories:**
- **ON_TRACK:** In transit, before ETA
- **ARRIVING_TODAY:** ETA is today
- **OVERDUE:** Past ETA with no actual arrival
- **NEEDS_TEMPO:** Arrived at lorry office but no tempo booked
- **COMPLETED:** Received in godown
**Key fields:** lorry_id, tracking_status, days_overdue, manifest summary (via LATERAL join)

#### v_stuck_orders
**Purpose:** Flag orders that have been sitting in one stage for too long.
**Logic:** `days_in_current_stage = EXTRACT(DAY FROM now() - status_changed_at)`, compared against configurable threshold.
**Key fields:** order_id, status, days_in_current_stage, customer_name

#### v_design_pipeline
**Purpose:** Show all active designs with pipeline health status.
**Categories:**
- **ON_TRACK:** Progressing normally
- **SLOW:** In PENDING or IN_PROGRESS for more than 5 days
- **ACTION_NEEDED:** In REVISION_REQUIRED (waiting on customer feedback or rework)
**Key fields:** design_id, status, pipeline_status, days_since_created

#### v_payment_followup
**Purpose:** Priority-sorted list of customers who need payment follow-up.
**Categories:**
- **NORMAL:** Recent payment, within thresholds
- **WARNING:** Past warning threshold
- **CRITICAL:** Past critical threshold
- **NEVER_PAID:** No payments on record
**Sorting:** Customers who have never paid appear first, then by days since last payment descending, then by outstanding amount descending.

#### v_customer_ledger
**Purpose:** Chronological transaction list per customer, showing invoices and payments interleaved.
**Structure:** UNION ALL of orders (as debits) and payments (as credits), ordered by transaction date.
**Use case:** This is the view shared with customers for payment reconciliation.

#### v_dashboard
**Purpose:** Single-row summary of all KPIs for the main dashboard.
**Fields:** active_orders, new_orders, pending_designs, active_print_jobs, active_lorries, overdue_lorries, godown_batch_count, total_godown_stock_kg, godown_aging_alerts, total_outstanding, payment_critical_count, orders_pending_delivery, orders_ready_to_deliver

---

## 11. UI/UX Design

### Design Philosophy

- **Information density over aesthetics.** The operator needs to see a lot of data at once without clicking through multiple screens. Think Bloomberg terminal energy adapted for a packaging business.
- **Color-coded status everywhere.** Green/yellow/red signals let the eye scan for problems without reading text.
- **Minimal clicks for common actions.** Status progression, payment recording, and delivery creation should be achievable in 2-3 clicks maximum.
- **Mobile is a companion, not a compromise.** The mobile view is fully functional for viewing and quick actions, not a dumbed-down version.

### Desktop Layout: Three-Zone Model

```
+----------+----------------------------+------------------+
|          |                            |                  |
| Sidebar  |      Main Content          |  Context Panel   |
| Nav      |      (Lists, Tables,       |  (Detail View,   |
|          |       Dashboard)           |   Quick Actions)  |
|          |                            |                  |
|          |                            |                  |
+----------+----------------------------+------------------+
   240px          Fluid (remaining)           400px (slide)
```

**Sidebar (Left):** Fixed navigation with module icons and labels. Shows alert badges (e.g., "3" next to Lorries when 3 are overdue).

**Main Content (Center):** The primary working area. Lists, tables, dashboards, and pipeline views render here.

**Context Panel (Right, slides in):** When clicking an item in the main content, a detail panel slides in from the right. This avoids full-page navigation for viewing details, keeping the list visible underneath. The panel supports quick actions (change status, record payment) without leaving the context.

### Mobile Layout: Bottom Navigation with Full-Screen Views

```
+----------------------------+
|                            |
|     Full-Screen Content    |
|     (Scrollable)           |
|                            |
|                            |
+----------------------------+
| Home | Orders | Lorry | $ | More |
+----------------------------+
```

**Bottom Navigation (5 tabs):**
1. **Home:** Dashboard KPIs in a card-based layout
2. **Orders:** Order list with swipe actions for status changes
3. **Lorry:** Active lorries with tracking status
4. **Payments (Rs):** Payment follow-up list and quick payment recording
5. **More:** Godown, designs, settings, customer management

**Mobile-specific patterns:**
- Tap to open full-screen detail views (replacing the sliding panel)
- Swipe actions for common operations
- Pull-to-refresh for data updates
- Touch-optimized input fields

---

## 12. Historical Data Migration Strategy

### The Problem

Years of business transactions exist only on paper. Entering every historical order, delivery, and payment would take months and is not practical. But the system needs to start with accurate outstanding balances.

### The Solution: Opening Balances + Cutoff Date

**Step 1: Set the system start date.**
Configured in `app_settings` as `system_start_date` (default: 2026-10-01). This is the dividing line between "paper era" and "digital era."

**Step 2: Calculate opening balances per customer.**
The operator goes through his paper records and calculates what each customer owes (or is owed) as of the system start date. This single number captures the net effect of all historical transactions.

**Step 3: Enter opening balances.**
Each customer's `opening_balance_amount` and `opening_balance_date` are set. Positive means the customer owes the business. Negative means the business owes the customer.

**Step 4: Enter historical records (optional).**
For important historical orders and payments, the operator can enter them with `is_historical = true`. These records show up in the activity history for reference but are excluded from financial calculations.

### Why This Works

The outstanding calculation is:
```
Outstanding = opening_balance_amount + SUM(non-historical invoices) - SUM(non-historical payments)
```

Historical records (`is_historical = true`) are filtered out of the invoice and payment sums, so they cannot double-count amounts already captured in the opening balance.

### Data Entry Priority

1. **Immediate (Day 1):** Opening balances for all active customers. Active orders currently in progress.
2. **First Week:** Products/SKU catalog per customer. Delhi printer details.
3. **First Month:** Historical orders for key customers (for reference). Regular lorries and transporter details.
4. **Ongoing:** System is live; new transactions are entered as they happen.

---

## 13. Real-time & Sync Architecture

### The Update Problem

The operator may have the dashboard open on his desktop at the office and simultaneously check the lorry tracker on his phone. When he updates a lorry status on his phone, the desktop dashboard should reflect the change without a manual refresh.

### Solution: Three-Layer Sync

**Layer 1: React Query (Client-side cache)**
- Every data fetch is managed by React Query with a unique query key.
- Stale-while-revalidate: show cached data immediately, fetch fresh data in the background.
- Optimistic updates: the UI updates instantly on user action, before the server confirms.
- If the server rejects the update, the optimistic change is rolled back.

**Layer 2: Supabase Realtime (Server push)**
- Key tables have Supabase Realtime enabled: orders, lorries, godown_batches, deliveries, payments, designs, print_jobs.
- The client subscribes to changes on these tables via WebSocket.
- When a change is received, the corresponding React Query cache is invalidated, triggering a background refetch.

**Layer 3: Prisma Transactions (Data integrity)**
- Complex operations (delivery with batch drawdown, status changes with cascading updates) are wrapped in Prisma interactive transactions.
- If any step fails, the entire operation rolls back.
- The transaction result triggers the Supabase Realtime broadcast.

### Sync Flow Example: Recording a Delivery

```
1. User taps "Record Delivery" on mobile
2. React Query: Optimistic update - UI shows delivery recorded
3. API Route: Prisma transaction begins
   a. Create delivery record
   b. Create delivery_items linking to godown batches
   c. Decrement godown_batch.quantity_remaining for each batch
   d. Check if order is fully delivered, update order.status if so
   e. Transaction commits
4. Supabase Realtime: Broadcasts changes to orders, deliveries, godown_batches
5. Desktop browser: Receives WebSocket events
   - React Query invalidates: delivery list, godown stock, order detail, dashboard KPIs
   - Background refetch pulls fresh data
   - UI re-renders with updated godown quantities and order status
```

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)

**Week 1: Project Setup & Core Infrastructure**
- Initialize Next.js project with TypeScript
- Configure Supabase project and run the database schema SQL
- Set up Prisma with the schema, generate the client
- Configure shadcn/ui with the design system (color tokens, typography)
- Set up authentication (Supabase Auth)
- Build the three-zone desktop layout shell (sidebar, main, context panel)
- Build the mobile layout shell (bottom navigation)

**Week 2: Customer & Product Management**
- Customer CRUD with all fields (including opening balance)
- Product catalog CRUD (per customer)
- Customer list with search, filter by company type
- Customer detail view with contact info, products, and opening balance

**Week 3: Order Command Center**
- Order CRUD with auto-generated order number
- Order list with filters (status, customer, date range)
- Order detail with status timeline
- Status change actions with trigger-based history logging
- Stuck orders view (v_stuck_orders integration)

### Phase 2: Supply Chain (Weeks 4-6)

**Week 4: Design & Print Pipeline**
- Design CRUD with version management
- Design pipeline kanban view
- Print job management
- Printer directory
- v_design_pipeline integration

**Week 5: Lorry Transit**
- Lorry CRUD with full transporter/driver details
- Lorry manifest management (lorry_items)
- Lorry tracker view with status badges
- Overdue alerts and "NEEDS_TEMPO" flagging
- v_lorry_tracker integration

**Week 6: Godown & Delivery**
- Godown batch management (receive stock from lorry)
- Aging view with color-coded thresholds
- Delivery creation with batch allocation flow
- Prisma transaction for delivery + batch drawdown
- v_godown_aging and v_pending_deliveries integration

### Phase 3: Financial & Intelligence (Weeks 7-9)

**Week 7: Payments & Ledger**
- Payment recording with mode, reference, bank
- Customer outstanding calculation (v_customer_outstanding)
- Payment follow-up list (v_payment_followup)
- Customer ledger view (v_customer_ledger)

**Week 8: Dashboard & Real-time**
- Dashboard KPI cards (v_dashboard integration)
- Supabase Realtime subscriptions
- React Query cache invalidation on realtime events
- Cross-device sync verification
- node-cron background jobs for daily alerts

**Week 9: Polish & Historical Data**
- Historical data entry flow (is_historical flag)
- Opening balance entry UI
- Settings page for configurable thresholds
- Activity log viewer
- Mobile optimization and testing
- Performance tuning (query optimization, index verification)

### Post-Launch

- WhatsApp integration for sending customer statements
- PDF generation for challans and invoices
- Analytics and trend reporting (monthly summaries, customer analysis)
- Multi-user support with role-based access
- Backup and disaster recovery procedures

---

## 15. Glossary

| Term | Definition |
|------|-----------|
| **Flexible Packaging** | Printed plastic pouches, wrappers, and laminates used to package consumer products |
| **FMCG** | Fast-Moving Consumer Goods: everyday products like snacks, spices, and food items |
| **Godown** | A warehouse or storage facility; in this business, where printed packaging material is stored before delivery to customers |
| **LR Number** | Lorry Receipt Number: a unique tracking number issued by the transport company for each shipment |
| **Tempo** | A small commercial vehicle (typically a Tata Ace or similar) used for local pickup and delivery within a city |
| **Lorry Office** | The transport company's depot/office at the destination city where goods arrive and are held for pickup |
| **Challan** | A delivery receipt or dispatch note given to the customer when goods are delivered |
| **RTGS** | Real Time Gross Settlement: a bank-to-bank transfer system for high-value payments |
| **NEFT** | National Electronic Funds Transfer: a bank transfer system for standard payments |
| **GPay** | Google Pay: a mobile payment platform widely used in India |
| **UPI** | Unified Payments Interface: India's instant payment system that GPay, PhonePe, and others are built on |
| **GST / GSTN** | Goods and Services Tax / GST Network: India's national tax system; GSTN is the 15-character identification number |
| **SKU** | Stock Keeping Unit: a unique identifier for each distinct product variant |
| **Opening Balance** | The net amount owed by a customer as of the system start date, capturing all pre-system transactions |
| **Partial Delivery** | When a customer takes only a portion of the ordered quantity; the remainder stays in the godown |
| **Aging** | How long stock has been sitting in the godown since it was received; used to trigger follow-up alerts |
| **BOPP** | Biaxially Oriented Polypropylene: a common material used in flexible packaging films |

---

*This document serves as the complete specification for the Smart Packaging Hub system. It should be used as the reference for all development, testing, and future feature discussions.*
