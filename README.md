# InvoiceFlow

<p align="center">
  <b>A lightweight, professional invoicing application for small businesses, freelancers, shops, and service providers.</b>
  <br />
  Create professional invoices and track their payments — with minimum complexity.
</p>

<p align="center">MVP complete, plus recurring invoices, quotes, credit notes, expense tracking, and inventory (Phases 16–20).</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-via%20Prisma-336791?logo=postgresql&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Tests" src="https://img.shields.io/badge/tests-vitest-6E9F18?logo=vitest&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-lightgrey" />
</p>

---

## Screenshots

| Dashboard | Invoice list & filters |
| --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Invoices](docs/screenshots/invoices-list.png) |

| Invoice detail (view, PDF, payments) | Customers |
| --- | --- |
| ![Invoice detail](docs/screenshots/invoice-detail.png) | ![Customers](docs/screenshots/customers-list.png) |

| Recurring invoices |
| --- |
| ![Recurring invoices](docs/screenshots/recurring-invoices.png) |

## Features

- **Authentication** — email/password with a signed session cookie; self-service business sign-up
- **Business profile** — name, logo, contact details, and a default currency across 9 supported currencies (including CNY)
- **Customers** — CRUD, search, and a detail page with invoice history, payment history, and a downloadable PDF statement
- **Products & services** — catalog with pricing, tax rate, and optional inventory tracking, selectable when building an invoice or quote
- **Invoices** — create/edit/delete drafts, a dynamic line-item builder with live totals, server-authoritative recalculation, status lifecycle (Draft → Sent → Partially Paid/Paid, or Cancelled), and automatically-derived Overdue status
- **Quotes/estimates** — the same line-item builder as invoices, a status lifecycle (Draft → Sent → Accepted/Rejected, with an auto-derived Expired), and one-click conversion of an accepted quote into a real, editable draft invoice
- **PDF generation** — professional invoice, quote, and per-customer payment statement PDFs, all viewable inline or downloadable, generated server-side
- **Payments** — record payments against an invoice with overpayment protection, a full payments ledger, and a per-customer breakdown
- **Credit notes** — issue a credit note against a sent/partially-paid invoice to reduce its balance due (e.g. for a return or billing correction), with a full audit trail and a business-wide list
- **Expense tracking** — categorized expense records (rent, software, travel, etc.) with search/category filtering and a dashboard total
- **Inventory** — optional per-product stock tracking with a reorder-level threshold, low-stock indicator, and every adjustment recorded as an auditable stock movement — stock only ever changes through an explicit adjustment, never automatically from invoicing
- **Dashboard** — total invoiced/paid/outstanding/overdue/expenses at a glance, recent invoices, and a monthly revenue chart
- **Search & filtering** — invoices, quotes, credit notes, and expenses by number, customer, status, category, or date range
- **Recurring invoices** — a schedule (weekly/monthly/quarterly/yearly) that auto-generates a real, fully-priced invoice each cycle, with pause/resume/cancel, a manual "Generate Now," and an optional daily cron trigger
- **Tenant isolation** — every business's data is fully isolated from every other business's, enforced at the query layer and covered by an integration test

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript + React |
| Styling | Tailwind CSS + shadcn/ui + Lucide Icons |
| Database | PostgreSQL via Prisma ORM (`@prisma/adapter-pg` driver adapter) |
| Validation | Zod |
| Forms | Server Actions (`FormData` + `useActionState`) for simple forms; React Hook Form + `useFieldArray` for the invoice line-item builder |
| PDF generation | `@react-pdf/renderer`, rendered server-side in Route Handlers |
| Auth | Hand-rolled — bcrypt password hashing + a signed, HTTP-only session cookie (HMAC-SHA256) |
| Testing | Vitest — unit tests plus a real-database tenant-isolation integration test |
| Notifications | sonner (toasts) |

## Getting Started

### Prerequisites

- Node.js 20+
- A running PostgreSQL instance (local or hosted)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/invoiceflow?schema=public` |
| `AUTH_SECRET` | Random secret used to sign session cookies. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `CRON_SECRET` | Optional. Authorizes calls to `/api/cron/recurring-invoices` (generate the same way). Only needed if you use recurring invoices with an automated scheduler — see [Recurring invoices](#recurring-invoices) below. |

> Don't have a local Postgres server? Prisma can run one for you during development: `npx prisma dev --detach`, then use the `DATABASE_URL` it prints.

### 3. Set up the database

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

This creates the schema (`User`, `Business`, `Customer`, `Product`, `Invoice`, `InvoiceItem`, `Payment`, `Quote`, `QuoteItem`, `CreditNote`, `Expense`, `StockMovement`) and seeds one demo business with customers, products, and invoices in different states (paid, partially paid, overdue).

Seeded login:

| Email | Password |
| --- | --- |
| `owner@invoiceflow.test` | `password123` |

New businesses can also self-register at `/register`.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Running tests

```bash
npm test
```

Runs the Vitest suite: pure unit tests for invoice/payment calculations and status logic, plus an integration test that proves the tenant-isolation query pattern (`findFirst({ id, businessId })`) actually blocks cross-business access, against the database configured by `DATABASE_URL`.

### Recurring invoices

Recurring invoices generate on their own once you either:

- Click **Generate Now** on a schedule's detail page (works with no extra setup), or
- Set `CRON_SECRET` and call `GET /api/cron/recurring-invoices` with `Authorization: Bearer $CRON_SECRET` once a day, from any external scheduler.

On Vercel, the included `vercel.json` already schedules this daily — Vercel automatically sends that header when `CRON_SECRET` is set as a project environment variable, so no extra wiring is needed.

### Production

```bash
npm run build
npm start
```

## Project Structure

```text
src/
  app/
    (auth)/               # Public routes: /login, /register — no app shell
    (app)/                # Protected routes, each with its own page.tsx + actions.ts:
      page.tsx              #   dashboard (real aggregates + revenue chart)
      customers/             #   list, [id] detail (invoice + payment history, statement PDF)
      products/              #   catalog CRUD
      invoices/               #   list w/ search+filters, new, [id] view, [id]/edit, [id]/pdf (route handler)
      quotes/                  #   list, new, [id] view, [id]/edit, [id]/pdf (route handler)
      expenses/                 #   list w/ search+category filter, dialog-based CRUD
      credit-notes/               #   business-wide read-only list (issued from an invoice's detail page)
      payments/                #   all-payments list
      settings/                 #   business profile + logo upload
  components/
    auth/, customers/, products/, invoices/, quotes/, expenses/, settings/, dashboard/   # Feature-specific forms/dialogs/views
    shared/                # SearchInput, EmptyState, TableSkeleton, PageSkeleton
    layout/                # App shell: sidebar, header, mobile nav
    ui/                    # shadcn/ui primitives
  lib/
    auth/                  # Session cookie signing, password hashing, rate limiting, current-user/business helpers
    validations/           # Zod schemas — one file per domain
    pdf/                   # @react-pdf/renderer document definitions
    invoice-calculations.ts # The one place line-item/invoice/payment money math happens
    invoice-status.ts       # "Overdue" derivation + status-filter query builder
    invoice-number.ts        # Sequential INV-{year}-{seq} generator
    quote-number.ts           # Sequential QUO-{year}-{seq} generator
    quote-status.ts            # "Expired" derivation, mirroring invoice-status.ts
    credit-note-number.ts       # Sequential CN-{year}-{seq} generator
    recurring-invoice-schedule.ts    # Next-run-date math for recurring invoices
    recurring-invoice-generator.ts   # Turns one due template into a real Invoice
    *.test.ts                # Vitest unit/integration tests, colocated with the code they test
prisma/
  schema.prisma            # Database schema
  migrations/              # Prisma migrations
  seed.ts                  # Dev/test seed data
```

## Architecture & Engineering Notes

<details>
<summary><b>Foundations: Prisma 7, auth, tenant isolation (click to expand)</b></summary>

- **Prisma 7** requires an explicit driver adapter for SQL databases (no bundled query engine binary). This project uses `@prisma/adapter-pg` with the `pg` driver, wired up as a singleton (`src/lib/prisma.ts`) to avoid exhausting connections in development.
- **Data model**: one `Business` per `User` for the MVP (multi-business support is on the roadmap). `Customer`, `Product`, `Invoice`, and `Payment` all carry a `businessId`; `Payment` additionally denormalizes it so it can be queried directly without a join.
- All monetary fields use Prisma's `Decimal` type mapped to Postgres `NUMERIC` — never floating point.
- Deleting a `Customer` with invoices is restricted at the database level; deleting a `Product` referenced by past invoice items nulls the reference instead of blocking, since invoice items snapshot their own description/price/tax at creation time.
- **Sessions**: a signed, HTTP-only cookie holds `{ userId, expiry }`, HMAC-SHA256 signed with `AUTH_SECRET`. No JWT/session library — verification is a constant-time signature check.
- **Tenant isolation**: `requireCurrentBusiness()` is the only sanctioned way a Server Action derives a `businessId` — it always comes from the session, never from client-submitted data. This pattern is enforced consistently across every feature and is covered by an integration test (see Testing & security hardening below).

</details>

<details>
<summary><b>Invoicing, PDF, and payments (click to expand)</b></summary>

- **Money math lives in one place**: `src/lib/invoice-calculations.ts` is the only code that computes subtotal/discount/tax/total/balance, entirely in `Prisma.Decimal`. The invoice form previews totals client-side for responsiveness, but that preview is discarded — every Server Action recomputes totals from the submitted line items before writing anything.
- **Invoice creation/editing calls its Server Action directly** rather than through a `<form action>`, because the form uses React Hook Form's `useFieldArray` for a dynamic item list — passing a typed object sidesteps serializing a nested array through `FormData`.
- **Invoice status**: `DRAFT → SENT → PARTIALLY_PAID/PAID`, plus `CANCELLED`, are the only statuses ever written to the database. `OVERDUE` is never stored — it's derived at read time from `dueDate < today AND balanceDue > 0`, so list filtering and status badges can never disagree.
- **Editing is DRAFT-only** — once an invoice is sent, its items/amounts are locked, matching how deletion is explicitly draft-scoped, and preventing a sent invoice's total from silently changing after a customer has seen it.
- **Overpayment is blocked**, and payment writes are transactional with an optimistic-concurrency guard: the balance is re-read inside the same transaction that writes it, and the write only commits if nothing changed in between — closing a real race condition that could otherwise let two concurrent payments overpay an invoice.
- **PDFs** are rendered server-side with `@react-pdf/renderer` — no headless browser dependency, so it works on any Node deploy target. Both the invoice PDF and the customer statement PDF support `?disposition=inline` (opens in a new tab) vs. the default `attachment` (forces download), and are marked `Cache-Control: private, no-store`.
- **Route Handlers are not covered by the layout's auth guard** — layouts only wrap page rendering. Every PDF route re-derives and re-scopes its own `businessId` from the session.

</details>

<details>
<summary><b>Recurring invoices (click to expand)</b></summary>

- A `RecurringInvoice` template stores its own line items, a `frequency`, a `nextRunDate`, and an optional `endDate` — it never duplicates money math: generation reuses the exact same `calculateInvoiceTotals()` and `generateInvoiceNumber()` that manual invoice creation uses.
- Generation and schedule-advancement happen in one transaction (`generateInvoiceFromTemplate`), and always advance from the *previous scheduled date*, not from "today" — so triggering a schedule early with "Generate Now" never shifts the rest of its future run dates.
- Auto-generated invoices are created as `SENT`, not `DRAFT` — the point of automation is not having to manually send each one — and carry a `recurringInvoiceId` back-reference, surfaced as a link on the generated invoice's detail page.
- `generateDueInvoices()` (used by the cron route) is deliberately **not** scoped to one business — a scheduled sweep has to cover every tenant — while the per-business "Generate Now" Server Action checks template ownership *before* handing off to the same shared generator, so the unscoped function is never reachable with an unauthorized id.
- The cron endpoint (`/api/cron/recurring-invoices`) authenticates with a shared secret (`Authorization: Bearer $CRON_SECRET`) rather than a session, since it's called by an external scheduler, not a logged-in user. Deleting a template keeps every invoice it already generated (`onDelete: SetNull` on the back-reference) — only the schedule itself is removed.

</details>

<details>
<summary><b>Quotes, credit notes, expenses & inventory (click to expand)</b></summary>

- **Quotes** reuse the exact same line-item builder and `calculateInvoiceTotals()` math as invoices — a `Quote`/`QuoteItem` pair mirrors `Invoice`/`InvoiceItem`. Status only ever moves forward (`DRAFT → SENT → ACCEPTED/REJECTED`); `EXPIRED` is derived at read time from `expiryDate < today`, never stored, the same pattern as an invoice's `OVERDUE`.
- **Converting a quote to an invoice** creates a real, independent `DRAFT` invoice (not a reference/alias) and stamps `Quote.convertedInvoiceId`, so the invoice can be edited afterward without touching the quote. The action re-derives the quote's *effective* status inside the same transaction before converting — an already-expired quote can't be converted just because the stale page in the browser still shows "Accepted."
- **Credit notes** reduce an invoice's `balanceDue` directly (not its `total`, which stays the historical record of what was billed) and flip the invoice to `PAID` if the credit fully offsets the remaining balance. Issuing one uses the identical read-then-guarded-write transaction pattern as recording a payment: the balance is re-read and the write is conditioned on it being unchanged, closing the same race window a concurrent payment or second credit note could otherwise open.
- **Expenses** are intentionally simple — categorized CRUD records with no downstream effect on invoices or reports beyond their own list and a dashboard total. There was no requirement to reconcile them against revenue, so no such logic exists.
- **Inventory is manual by design**: `Product.stockQuantity` never changes as a side effect of creating, sending, or paying an invoice. The only writes to it go through `adjustStockAction`, and every adjustment — increase or decrease, including a new product's initial stock — creates a `StockMovement` audit row in the same transaction. This keeps "why did stock change" always answerable, and avoids the much larger design question of what should happen to stock when a draft invoice is edited or cancelled after having already decremented it.
- **CNY (Chinese Yuan)** was added as a 9th supported currency alongside the original 8 — purely a `Currency` enum value and a label; no currency-specific formatting or conversion logic exists anywhere (this app never converts between currencies, it only tags each invoice/quote with one).

</details>

<details>
<summary><b>Testing & security hardening (click to expand)</b></summary>

A full tenant-isolation audit (every database call touching business-owned data) found no exploitable cross-business data leak, but surfaced several real hardening items — all fixed:

- A payment-recording race condition that could let two concurrent submissions overpay an invoice — closed with a transactional optimistic-concurrency check.
- A matching check-then-write gap in invoice editing — the draft-status check now happens inside the same transaction as the write.
- Login now always runs the bcrypt compare, even for a nonexistent email (against a fixed dummy hash), so response time can't be used to enumerate valid accounts.
- `AUTH_SECRET` is rejected at startup if shorter than 32 characters.
- The logo upload verifies the file's actual magic bytes against its claimed MIME type, and uses a random filename instead of a timestamp.
- Login is rate-limited (5 attempts / 15 minutes per email).

`npm test` covers line-item/invoice-total/payment math against hand-computed fixtures, invoice status derivation, Zod schema edge cases, and a tenant-isolation integration test that creates two businesses against a real database and asserts one can't read, query, or delete the other's data.

</details>

## Roadmap

Recurring invoices, quotes/estimates, credit notes, expense tracking, and inventory are all implemented (see Features above). Still intentionally excluded, planned for later phases: a customer-facing portal, online payment gateways, email automation, WhatsApp sharing, advanced reports, role management, multi-business accounts, and advanced tax/accounting features.

## Known Limitations

- **`prisma migrate dev`'s shadow database** can fail against certain local Postgres setups where the main database is unconventionally named (e.g. `npx prisma dev`'s instance, which connects to a database literally called `template1` — Postgres won't let `CREATE DATABASE ... TEMPLATE template1` run against it while connections are open, and this project hit that directly while adding recurring invoices). Set `SHADOW_DATABASE_URL` to a separate, empty database on the same server to work around it; a normal Postgres server (RDS, Supabase, a plain `createdb`) never needs this.
- **`npx prisma dev`'s local instance occasionally drops a connection mid-query** (`P1017: Server has closed the connection`), surfacing as an intermittent 500 on an otherwise-correct page or a flaky integration test run. It's been observed on ordinary reads with no unusual concurrency involved and self-resolves on retry or a dev-server restart; a normal Postgres server has not shown this. Don't chase it as an application bug — retry before assuming a regression.
- **Rate limiting** on login is in-memory and per-process — fine for a single instance, but a multi-instance deployment should move it to a shared store (e.g. Redis) and extend it to registration.
- **Uploaded logos** are written to `public/uploads/` at runtime, which does not persist across redeploys on serverless targets. A production deployment should use an object store instead.
- **Sessions cannot be revoked early** — the cookie is a stateless signed token valid for its full 7-day lifetime; logout only clears the client's copy.
- `npm audit` reports an advisory in `deepmerge-ts`, a transitive dependency of Prisma's config loader, affecting only Prisma's own dev-time config merging — no runtime exposure.

## License

MIT
