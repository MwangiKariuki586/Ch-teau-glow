# Château Glow — Beauty & Aesthetics Marketplace

A multi-branch digital experience platform combining **service booking, e-commerce, and operations management** for beauty & aesthetics businesses.

Customers discover services/products, book appointments (Branch → Specialist → Date & Time → Payment), manage bookings, and receive aftercare. Staff manage branches, specialists, bookings, catalogues, and analytics from a role-scoped admin console.

> Full capability map: see [`PLATFORM_SPECS.md`](./PLATFORM_SPECS.md)

---

## Features

### Public Experience (visitors)

- Landing page: hero, featured services, categories, AED pricing packages, consultation CTA, FAQ, testimonials, offers, blogs, contact, newsletter (`/api/newsletter`)
- Service catalogue + detail (`/services`, `/services/[slug]`) — search, category tabs
- Product catalogue + detail (`/products`, `/products/[slug]`, `/shop`) — filters, gallery, related products, cart
- Consultation enquiry (`/consultation`)
- About, blogs, offers, contact with email dispatch

### Customer Workspace (signed-in)

- Dashboard (`/customer`) — upcoming bookings overview
- 4-step booking flow (`/book`): Branch → Specialist → Date & Time → Stripe Payment
- Booking history + detail (`/customer/bookings`, `/customer/bookings/[id]`) — policy-aware reschedule/cancel, aftercare instructions, review submission
- Profile, settings, favourites/wishlist (`/customer/profile`, `/customer/settings`, `/customer/favorites`)
- Real-time notifications (`/notifications`)

### Admin Operations (staff)

- Dashboard (`/admin`) — role-scoped KPIs, today's bookings, recent activity
- Bookings queue — approve/reject/complete, bulk actions, filters
- Specialists, branches, services, products, customers CRUD (incl. image upload via Supabase Storage)
- Role-based access: `owner`, `admin`, `branch_manager`, `concierge`, `practitioner` (practitioners see only own bookings)
- Settings (email templates, notifications, payments), CMS content, analytics (Recharts), support tickets, recovery center

### Domain-specific (Stage 4)

- Multi-branch operations with branch-scoped data + cockpit view
- Practitioner model linked via `specialist_id` on `user_profiles`
- Automated aftercare email job (`/api/jobs/aftercare-dispatch`)
- Per-booking cancellation/reschedule policy engine (`/api/bookings/[id]/policy`)
- AED min/max service pricing, duration-based; separate consultation workflow

## Tech Stack

| Layer                                | Choice                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Framework                            | Next.js 16 (App Router), React 19, TypeScript                                          |
| UI                                   | Tailwind CSS 4, Shadcn/UI, Radix, Lucide, Mantine, Schedule-X, Tiptap, Embla, Recharts |
| Backend                              | Next.js API routes (`/api/bookings`, `/api/services`, `/api/payment-intents`, …)       |
| Database / Auth / Storage / Realtime | Supabase (Postgres + Auth + Storage + Realtime)                                        |
| Payments                             | Stripe (Payment Intents + `/api/webhooks/stripe`)                                      |
| Email                                | Resend (transactional + aftercare)                                                     |
| Validation / Forms                   | Zod + React Hook Form                                                                  |
| Testing                              | Jest + Testing Library                                                                 |
| Deploy                               | Vercel (auto-deploy on push)                                                           |

Brand tokens: `#6B4423` (brown) / `#C9A96E` (gold).

## Project Structure

```
src/app/
  (landing)/          # marketing landing
  (public)/           # services, products, shop, about, blogs, offers, contact, consultation
  book/               # 4-step booking flow
  customer/           # dashboard, bookings, profile, settings, favorites
  admin/              # dashboard, bookings, specialists, branches, services, products, …
  api/                # domain API routes + stripe webhooks + jobs (aftercare-dispatch)
  auth/ bookings/ notifications/ waitlist/
src/components/ src/features/ src/hooks/ src/lib/
supabase/
  migrations/ seed.sql functions/  # Postgres schema, RLS, edge functions
scripts/              # e.g. sync-codex-supabase-mcp.ps1
PLATFORM_SPECS.md     # Foundation + Stages 0–4 capability map
```

## Getting Started

### Prerequisites

- Node.js 20+, npm
- Supabase project, Stripe test account, Resend API key

### 1. Install

```bash
npm install
```

### 2. Configure env

```bash
cp .env.example .env
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `CRON_SECRET`, `AFTERCARE_DISPATCH_SECRET`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

Stripe keys: https://dashboard.stripe.com/test/apikeys · Webhook secret: https://dashboard.stripe.com/test/webhooks

### 3. Database

Apply migrations in `supabase/migrations/` to your Supabase project (via Supabase CLI or dashboard SQL editor), then optionally load `supabase/seed.sql`.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000

## Scripts

| Command                                         | Description                                         |
| ----------------------------------------------- | --------------------------------------------------- |
| `npm run dev`                                   | Dev server                                          |
| `npm run build` / `npm run start`               | Production build / serve                            |
| `npm run lint`                                  | ESLint                                              |
| `npm run test` / `test:watch` / `test:coverage` | Jest                                                |
| `npm run mcp:sync`                              | Sync Codex Supabase MCP (Windows PowerShell script) |

## Roles & Access

Middleware refreshes Supabase sessions; `getAdminSession` gates admin routes. Roles: `owner` > `admin` > `branch_manager` > `concierge` > `practitioner` > `customer`. Branch-scoped queries enforce multi-branch isolation.

## Deployment

Push to main → Vercel auto-deploys (see `vercel.json`). Set all `.env.example` vars in Vercel project settings and configure the Stripe webhook endpoint to `<app-url>/api/webhooks/stripe`.

## Roadmap

From `PLATFORM_SPECS.md` status (~80% Foundation, 85% Stage 0, 70% Stage 1/3, 60% Stage 2, 50% Stage 4):

- [ ] Unified search, service/product comparison, reviews UI
- [ ] Comms center, document wallet, universal requests tracker
- [ ] Loyalty/memberships, bundles, gift cards, waitlist, consent forms
- [ ] KYC review, quotes/orders, payouts, audit-log UI
- [ ] Structured logging/monitoring, unified analytics, SEO hardening
