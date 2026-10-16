# Smart Packaging Hub (kanitham)

> **Palantir-style Operational Intelligence Console** for a flexible packaging supply business based in Chennai, bridging Delhi printing presses, interstate lorry transit, Chennai godown inventory, customer deliveries, and customer-level financial ledger.

---

## 🌟 Key Features & Architecture

Built strictly according to [`Smart-Packaging-Hub-Project-Documentation.md`](./Smart-Packaging-Hub-Project-Documentation.md) and [`smart-packaging-hub-schema.sql`](./smart-packaging-hub-schema.sql):

### 1. Three-Zone Desktop Architecture
- **Zone 1: Left Navigation Sidebar (240px)** with live module status and badge counters (overdue shipments, aging godown batches, stuck orders, payment collections).
- **Zone 2: Fluid Main Operational Area** for dashboard KPI widgets, stage filter bars, and high-density data tables.
- **Zone 3: Sliding Context Panel (400px)** that opens on row click for deep inspection, 13-stage lifecycle visualization, and instant operations without navigating away.
- **Mobile Experience:** Touch-optimized bottom navigation with full-screen drilldowns.

### 2. Core Modules
1. **Intelligence Dashboard (`/`):** 12 computed KPIs from `v_dashboard`, urgent alert banners (overdue lorries, godown aging > 30 days, orders stuck > 7 days), actionable "Ready to Deliver" list, and live audit stream.
2. **Order Command Center (`/orders`):** 13-stage lifecycle tracking (`ORDER_RECEIVED` through `CLOSED`), status history timeline, stuck order alarms, and order creation modal.
3. **Design Pipeline (`/designs`):** 5-column Kanban board (`PENDING`, `IN_PROGRESS`, `SENT_FOR_APPROVAL`, `REVISION_REQUIRED`, `APPROVED`), version cards with artwork status.
4. **Delhi Print Operations (`/print`):** Delhi printer directory (Okhla, Patparganj, Naraina), cylinder/color specs, and dispatch scheduling.
5. **Lorry Transit Tracker (`/lorries`):** Delhi to Chennai transport monitoring with LR numbers, overdue alarms, tempo pickup alerts, and multi-order manifest reconciliation.
6. **Godown Intelligence (`/godown`):** 3-category stock overview (Allocated awaiting partial delivery, Received delivery not started, Free stock), automated 15-day warning and 30-day critical aging analysis, and customer aggregate stock.
7. **Deliveries & Challans (`/deliveries`):** Full and partial delivery issuance with transactional FIFO batch drawdown and auto-generated challan numbers.
8. **Payments & Customer Ledger (`/payments`):** Priority follow-up hierarchy (`NEVER_PAID` &rarr; `CRITICAL` &rarr; `WARNING`), chronological debit/credit ledger, and one-click WhatsApp reconciliation statement generator.
9. **Customers & Product Catalog (`/customers`):** Chennai FMCG client profiles with historical paper-era opening balance migration and per-customer SKU specs.
10. **Settings & Historical Migration (`/settings`):** Configurable alert thresholds, system start date cutoff, audit trail (`activity_log`), and one-click demo data re-seeding.

---

## 🛠️ Technology Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Sonner toasts
- **Database:** PostgreSQL 16 (with all 14 tables, 7 enums, 2 triggers, 30+ indexes, and 10 intelligence views)
- **Data Layer:** Prisma ORM + direct PostgreSQL connection pool (`pg`) for sub-millisecond view queries and interactive transactions
- **State & Sync:** TanStack React Query v5 for client cache invalidation and background refetching
- **Background Scheduler:** `node-cron` for 6:00 AM transit/godown checks and 8:00 AM collections follow-up alerts

---

## 🚀 Getting Started

### 1. Start PostgreSQL (Docker)
```bash
docker compose up -d
```
*Note: The container runs on port 5432 and auto-mounts `smart-packaging-hub-schema.sql`.*

### 2. Environment Variables
Create `.env` (already pre-configured for local PostgreSQL):
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kanitham?schema=public"
NEXT_PUBLIC_APP_NAME="Smart Packaging Hub"
NEXT_PUBLIC_APP_SUBTITLE="Palantir-style Operational Intelligence Console"
```

### 3. Run the Application
```bash
# Development mode
npm run dev

# Production build and start
npm run build
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Database Seed / Reset
To populate realistic Chennai FMCG client orders, Delhi printers, lorries, and aging batches:
```bash
npm run db:seed
```
*(Or use the "Reset / Re-seed Demo Data" button inside the Settings page).*
