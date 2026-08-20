# InvoiceFlow

<p align="center">
  <b>A lightweight, professional invoicing application for small businesses, freelancers, shops, and service providers.</b>
  <br />
  Create professional invoices and track their payments — with minimum complexity.
</p>

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

## Features

- **Authentication** — email/password with a signed session cookie; self-service business sign-up
- **Business profile** — name, logo, contact details, and a default currency across 8 supported currencies
- **Customers** — CRUD, search, and a detail page with invoice history, payment history, and a downloadable PDF statement
- **Products & services** — catalog with pricing and tax rate, selectable when building an invoice
- **Invoices** — create/edit/delete drafts, a dynamic line-item builder with live totals, server-authoritative recalculation, status lifecycle (Draft → Sent → Partially Paid/Paid, or Cancelled), and automatically-derived Overdue status
- **PDF generation** — a professional invoice PDF and a per-customer payment statement PDF, both viewable inline or downloadable, generated server-side
- **Payments** — record payments against an invoice with overpayment protection, a full payments ledger, and a per-customer breakdown
- **Dashboard** — total invoiced/paid/outstanding/overdue at a glance, recent invoices, and a monthly revenue chart
- **Search & filtering** — invoices by number, customer, status, and date range
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

> Don't have a local Postgres server? Prisma can run one for you during development: `npx prisma dev --detach`, then use the `DATABASE_URL` it prints.

### 3. Set up the database

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

This creates the schema (`User`, `Business`, `Customer`, `Product`, `Invoice`, `InvoiceItem`, `Payment`) and seeds one demo business with customers, products, and invoices in different states (paid, partially paid, overdue).

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
      payments/                #   all-payments list
      settings/                 #   business profile + logo upload
  components/
    auth/, customers/, products/, invoices/, settings/, dashboard/   # Feature-specific forms/dialogs/views
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

The MVP intentionally excludes the following, planned for later phases: recurring invoices, quotes/estimates, credit notes, expense tracking, inventory, a customer-facing portal, online payment gateways, email automation, WhatsApp sharing, advanced reports, role management, multi-business accounts, and advanced tax/accounting features.

## Known Limitations

- **Rate limiting** on login is in-memory and per-process — fine for a single instance, but a multi-instance deployment should move it to a shared store (e.g. Redis) and extend it to registration.
- **Uploaded logos** are written to `public/uploads/` at runtime, which does not persist across redeploys on serverless targets. A production deployment should use an object store instead.
- **Sessions cannot be revoked early** — the cookie is a stateless signed token valid for its full 7-day lifetime; logout only clears the client's copy.
- `npm audit` reports an advisory in `deepmerge-ts`, a transitive dependency of Prisma's config loader, affecting only Prisma's own dev-time config merging — no runtime exposure.

## License

MIT
