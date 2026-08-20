# InvoiceFlow

A lightweight, professional invoicing application for small businesses, freelancers, shops, and service providers. InvoiceFlow focuses on one thing: creating professional invoices and tracking their payments with minimum complexity.

> **Status:** Phase 4 — Products & Services. Invoicing, PDF export, and payments are not implemented yet; see [Development Phases](#development-phases) below.

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript + React
- **Styling:** Tailwind CSS + shadcn/ui + Lucide Icons
- **Database:** PostgreSQL via Prisma ORM (using the `@prisma/adapter-pg` driver adapter, required by Prisma 7)
- **Validation:** Zod
- **Forms:** Server Actions for simple forms (login, register, business profile); React Hook Form is reserved for forms with dynamic field arrays, starting with invoice line items in Phase 5
- **Auth:** Hand-rolled — bcrypt password hashing + a signed, HTTP-only session cookie (HMAC-SHA256, no external session/JWT library)

## Prerequisites

- Node.js 20+
- A running PostgreSQL instance (local or hosted)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and set your database connection string:

```bash
cp .env.example .env
```

| Variable       | Description                                                              |
| -------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/invoiceflow?schema=public` |
| `AUTH_SECRET`  | Random secret used to sign session cookies. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |

### 3. Set up the database

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

This creates the schema (`User`, `Business`, `Customer`, `Product`, `Invoice`, `InvoiceItem`, `Payment`) and seeds one demo business with customers, products, and a few invoices in different states (paid, partially paid, overdue).

Seeded login:

| Email | Password |
| --- | --- |
| `owner@invoiceflow.test` | `password123` |

New businesses can also self-register at `/register`.

> Don't have a local Postgres server? Prisma can run one for you during development: `npx prisma dev --detach`, then use the `DATABASE_URL` it prints.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Production

```bash
npm run build
npm start
```

## Project Structure

```text
src/
  app/
    (auth)/             # Public routes: /login, /register — no app shell
    (app)/               # Protected routes: dashboard, invoices, customers, products, payments, settings
  components/
    auth/                # Login/register forms + shared auth card
    settings/            # Business profile form
    layout/              # App shell: sidebar, header, mobile nav, page placeholders
    ui/                  # shadcn/ui primitives
  lib/
    auth/                # Session cookie signing, password hashing, current-user/business helpers
    validations/         # Zod schemas for auth + business profile
    prisma.ts            # Prisma client singleton (driver adapter)
    currencies.ts         # Shared currency list/labels
  generated/prisma/      # Generated Prisma Client (git-ignored, regenerate with `npx prisma generate`)
prisma/
  schema.prisma          # Database schema (User, Business, Customer, Product, Invoice, InvoiceItem, Payment)
  migrations/            # Prisma migrations
  seed.ts                # Dev/test seed data
prisma.config.ts         # Prisma CLI configuration (schema path, migrations, seed command, datasource)
public/uploads/           # User-uploaded business logos (git-ignored)
```

## Architecture Notes

- **Prisma 7** requires an explicit driver adapter for SQL databases (no bundled query engine binary). This project uses `@prisma/adapter-pg` with the `pg` driver, wired up in `src/lib/prisma.ts` as a singleton to avoid exhausting connections in development.
- **Prisma configuration** lives in `prisma.config.ts` (schema path, migration path, seed command, datasource URL) rather than solely in `schema.prisma`, per the Prisma 7 CLI configuration model. `.env` is loaded explicitly via `dotenv/config`.
- **Data model**: one `Business` per `User` for the MVP (multi-business support is a later phase). `Customer`, `Product`, `Invoice`, and `Payment` all carry a `businessId` for tenant-scoped queries; `Payment` additionally denormalizes `businessId` (alongside `invoiceId`) so it can be queried directly without a join, matching the tenant-isolation requirement enforced in Phase 12. `InvoiceItem` reaches its business only through its parent `Invoice`.
- All monetary fields use Prisma's `Decimal` type mapped to Postgres `NUMERIC` — never floating point. Quantities and tax rates are also `Decimal` to support fractional quantities and percentage tax rates.
- Deleting a `Customer` that has invoices is restricted at the database level (`onDelete: Restrict`) to protect financial history; deleting a `Product` referenced by past invoice items nulls the reference (`onDelete: SetNull`) instead of blocking, since invoice items snapshot their own description/price/tax at creation time.
- Business logic and calculations (introduced from Phase 5 onward) are kept out of UI components and live in dedicated service/utility modules — never computed client-side only.
- Every future database query will be scoped by `businessId` to enforce tenant isolation between businesses (see Phase 12 of the plan).
- **Sessions**: a signed, HTTP-only cookie holds `{ userId, expiry }`, HMAC-SHA256 signed with `AUTH_SECRET` (`src/lib/auth/session.ts`). No JWT/session library — the payload is small and verification is a constant-time signature check. Passwords are hashed with `bcryptjs`.
- **Route protection**: `src/app/(app)/layout.tsx` calls `requireCurrentUser()`, which redirects to `/login` if there's no valid session — enforced for every route under the `(app)` group in one place rather than per-page. `(auth)` routes redirect *to* `/` if a session already exists.
- **Tenant isolation**: `requireCurrentBusiness()` (`src/lib/auth/current-user.ts`) is the only sanctioned way Server Actions derive a `businessId` — it always comes from the session, never from client-submitted form data. The business profile Server Action (`src/app/(app)/settings/actions.ts`) follows this pattern; every future business-scoped mutation should too.
- One `Business` per `User` in this MVP, so `/register` creates both atomically via a nested Prisma write.
- **Customers & Products** (Phases 3–4) follow the same shape: a Server Component page fetches data scoped to `requireCurrentBusiness()`, a client "view" component renders the table/search/dialogs, and mutations go through Server Actions in an adjacent `actions.ts` that re-derive `businessId` from the session and re-validate with the same Zod schema used for any client-side checks. Deleting a customer is blocked at the application level (not just the DB's `onDelete: Restrict`) if it has invoices, with a friendly error instead of a raw constraint failure.
- **Radix `AlertDialogAction` gotcha**: it's Radix's `DialogClose` under the hood and closes the dialog synchronously on click — if it's also a form's submit button, the form can get unmounted before the browser's native submit fires, and the action silently never runs. Delete confirmations here use a plain `Button type="submit"` inside the form instead, with an explicit `useActionState` success flag closing the dialog once the Server Action confirms.

## Development Phases

This project is being built incrementally. Each phase produces a working application before the next begins:

| Phase | Scope |
| --- | --- |
| 0 | Project foundation (this phase): tooling, layout, navigation shell |
| 1 | Database schema, migrations, seed data |
| 2 | Authentication & business profile |
| 3 | Customer management |
| 4 | Products & services catalog |
| 5 | Invoice creation |
| 6 | Professional invoice view |
| 7 | PDF generation |
| 8 | Payment tracking |
| 9 | Dashboard statistics |
| 10 | Search, filtering & invoice status |
| 11 | UX polish |
| 12 | Security & tenant isolation review |
| 13 | Automated testing |
| 14 | Final MVP review |
| 15 | Documentation |

## Known Issues

- `npm audit` reports a high-severity advisory in `deepmerge-ts`, a transitive dependency of Prisma's config loader (`@prisma/config`). This affects Prisma's own dev-time config merging (a stack-exhaustion DoS on deeply recursive input we don't control) and has no runtime/production exposure. Re-check on the next Prisma patch release.
- The local `.env` in this environment points at a `prisma dev` (local Prisma-managed Postgres) instance for development. Point it at your own PostgreSQL server (or run `npx prisma dev`) as described above.
