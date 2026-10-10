# BROWZ DXP — Platform Specs

> Mapped to the Platform Hierarchy & Stage Model (Foundation + Stages 0–4).

---

## Platform Identity

| Field | Value |
|-------|-------|
| **Platform Name** | BROWZ DXP |
| **Type** | Platform of Solutions (PoS) |
| **Domain** | Beauty & Aesthetics |
| **Purpose** | A multi-branch beauty and aesthetics digital experience platform combining service booking, e-commerce, and operations management. |
| **Tech Stack** | Next.js 16 (App Router), Supabase (Postgres + Auth + Storage + Realtime), Stripe, Resend, Vercel |

---

## Platform Hierarchy (BROWZ Context)

| Level | Name | Description |
|-------|------|-------------|
| **PoS** | BROWZ DXP | The unified platform housing all solutions |
| **SoA** | Public Experience | Customer-facing discovery, booking, and commerce |
| **SoA** | Admin Operations | Staff and owner operations console |
| **SoA** | Customer Workspace | Signed-in customer account and self-service |
| **AoF** | Booking | Service booking flow with availability and payment |
| **AoF** | Shop | Product catalogue and cart |
| **AoF** | Branch Cockpit | Per-branch operational view |

---

## Platform Foundation

> Sits above all stages. Shared technical infrastructure that all solutions depend on.

| Capability | Status | Implementation |
|------------|--------|----------------|
| **Design System** | ✅ Built | Shadcn/UI + Tailwind CSS 4, brand tokens (`#6B4423`, `#C9A96E`) |
| **Global Navigation & Layout** | ✅ Built | Route-group layouts (`(public)`, `admin`, `customer`), shared Navbar/Footer |
| **Authentication & IAM** | ✅ Built | Supabase Auth, role-based access (`owner`, `admin`, `branch_manager`, `concierge`, `practitioner`, `customer`), middleware session refresh |
| **Database Architecture** | ✅ Built | Supabase Postgres — services, bookings, branches, specialists, products, user_profiles, notifications |
| **API Gateway / Service Layer** | ✅ Built | Next.js API routes organised by domain (`/api/bookings`, `/api/services`, `/api/payment-intents`, etc.) |
| **File Storage & Media** | ✅ Built | Supabase Storage (avatars, product images, service covers) |
| **Payments Infrastructure** | ✅ Built | Stripe payment intents + webhooks (`/api/webhooks/stripe`) |
| **Notifications & Comms** | ✅ Built | Supabase Realtime notifications, Resend transactional email, aftercare dispatch job |
| **Observability / Logging** | 🔲 Planned | Error boundaries in place; structured logging and monitoring not yet implemented |
| **CI/CD** | ✅ Built | Vercel deployment pipeline (auto-deploy on push) |
| **Analytics Infrastructure** | 🔲 Planned | Recharts used for admin dashboards; unified analytics pipeline not yet implemented |

---

## Stage 0 — Landing & Visitor Onboarding

**Purpose:** The digital front door. Guides diverse visitors (customers, professionals, general enquiries) into the right part of the platform before they transact.

### Built

| Feature | Route / Component | Notes |
|---------|-------------------|-------|
| Hero section with CTA | `/` — `HeroSection` | Brand imagery, primary CTAs to services and booking |
| Featured services | `/` — `FeaturedServicesSection` | Highlights signature treatments |
| Service categories | `/` — `CategoriesSection` | Visual category navigation |
| Pricing packages | `/` — `PricingSection` | AED-denominated packages with hover effects |
| Consultation CTA | `/` — `ConsultationCTASection` | Drives visitors to consultation booking |
| FAQ | `/` — `FAQSection` | Common questions, native accordion (no hydration issues) |
| Testimonials | `/` — `TestimonialsSection` | Social proof |
| About page | `/about` | Brand story, team, services overview |
| Blogs | `/blogs` | Editorial content, featured post |
| Contact | `/contact` | Contact form with email dispatch |
| Offers / Promotions | `/offers` | Curated packages and beauty bundles |
| Newsletter signup | Landing page | Email capture via `/api/newsletter` |
| Countdown timer | Landing page | Promotional urgency element |

### Planned / Gaps

- Role-based entry points (e.g. "Are you a specialist? Join here") not yet implemented
- Visitor analytics and conversion tracking not yet wired
- SEO metadata strategy (structured data, OG tags) partially implemented

---

## Stage 1 — Multi-Marketplace Discovery & Enquiry

**Purpose:** Unified discovery across services and products so visitors can find, compare, and enquire before booking or purchasing.

### Built

| Feature | Route / Component | Notes |
|---------|-------------------|-------|
| Services catalogue | `/services` — `ServicesPage`, `ServicesClientShell` | Category tabs, search, service cards |
| Service detail page | `/services/[slug]` | Full service info, pricing, booking CTA |
| Products catalogue | `/products` — `ProductsIndexPage`, `ProductsClientShell` | Category filter, search, product cards |
| Product detail page | `/products/[slug]` — `ProductDetailsPage` | Gallery, pricing, add-to-cart, related products |
| Shop | `/shop` | Storefront entry point |
| Consultation discovery | `/consultation` | Enquiry form for personalised treatment plans |
| Favourites | `/customer/favorites` | Session-aware wishlist for signed-in users |

### Planned / Gaps

- Unified search across services and products not yet implemented
- Eligibility pre-checks before booking not yet surfaced in discovery
- Comparison feature not yet built
- Reviews and ratings display (data model exists, UI partial)

---

## Stage 2 — Application & Account Experience

**Purpose:** The signed-in workspace where customers manage their relationship with the platform — book, track, pay, communicate, and manage their profile.

### Built

| Feature | Route / Component | Notes |
|---------|-------------------|-------|
| Customer dashboard | `/customer` | Overview of upcoming bookings and account status |
| Booking flow | `/book` — `BookingFlow` | 4-step: Branch → Specialist → Date & Time → Payment. Stepper UI with brown/gold theme |
| Booking history | `/customer/bookings` | List of past and upcoming bookings |
| Booking detail | `/customer/bookings/[id]` | Full booking detail, aftercare, cancellation/reschedule |
| Payment | Embedded in booking flow | Stripe payment intent, card capture |
| Customer profile | `/customer/profile` | Name, phone, avatar, preferences |
| Customer settings | `/customer/settings` | Account preferences |
| Notifications | `/notifications` | Real-time notification centre |
| Aftercare | `/bookings/[id]/aftercare` | Post-service aftercare instructions |
| Reschedule / Cancel | Booking detail drawers | Policy-aware reschedule and cancellation |
| Review submission | `/api/bookings/[id]/review` | Post-service review API |

### Planned / Gaps

- Document Wallet (evidence/document reuse) not yet built
- Communications Center (in-platform messaging) not yet built
- Universal Requests tracker (single view of all open requests) not yet built
- Apply flows for partner/specialist onboarding not yet built
- Payout management for partner specialists not yet built

---

## Stage 3 — Fulfilment, Sales & Operations

**Purpose:** The operations layer that processes bookings, manages staff, runs the business, and configures the platform.

### Built

| Feature | Route / Component | Notes |
|---------|-------------------|-------|
| Admin dashboard | `/admin` — `DashboardOverview` | Role-scoped KPIs, today's bookings, recent activity |
| Bookings queue | `/admin/bookings` | Approve, reject, complete bookings; bulk actions; filters |
| Specialist management | `/admin/specialists` | Create, edit, assign to branch; provisions auth user + profile |
| Branch management | `/admin/branches` | Multi-branch CRUD, branch cockpit view |
| Service management | `/admin/services` | Create, edit, publish/unpublish services with categories |
| Product management | `/admin/products` | Product CRUD with image upload |
| Customer management | `/admin/customers` | Customer list and profile view |
| Role-based access | Middleware + `getAdminSession` | `owner`, `admin`, `branch_manager`, `concierge`, `practitioner` — each sees scoped data |
| Settings | `/admin/settings` | Email templates, notification settings, payment config |
| Content management | `/admin/content` | CMS-style content editing |
| Analytics | `/admin/analytics` | Business performance charts |
| Notifications | `/admin/notifications` | Admin notification centre |
| Support | `/admin/support` | Support ticket management |
| Recovery center | `/admin/recovery-center` | Data recovery tools |
| Admin profile | `/admin/profile` | Staff profile with role badge, avatar upload |

### Planned / Gaps

- Agent queues and routing (for concierge/support workflows) not yet formalised
- KYC / document review workflow not yet built
- Quotes and formal order management not yet built
- Payout management for specialist partners not yet built
- Audit log viewer not yet surfaced in UI (backend logging partial)

---

## Stage 4 — Specialised

**Purpose:** Domain-specific capabilities for the beauty and aesthetics vertical — full end-to-end features with domain rules, compliance, and UX.

### Built

| Feature | Notes |
|---------|-------|
| Multi-branch operations | Branch-scoped data, branch cockpit, branch-aware booking and specialist assignment |
| Specialist practitioner model | Practitioners see only their own bookings and dashboard data; linked via `specialist_id` on `user_profiles` |
| Aftercare dispatch | Automated post-service aftercare email job (`/api/jobs/aftercare-dispatch`) |
| Booking policy engine | Cancellation and reschedule policies per booking (`/api/bookings/[id]/policy`) |
| Service pricing model | Min/max price range per service, AED currency, duration-based |
| Consultation workflow | Separate consultation booking flow distinct from standard service booking |

### Planned / Gaps

- Loyalty / membership programme not yet built
- Package and bundle redemption tracking not yet built
- Regulatory compliance workflows (e.g. treatment consent forms) not yet built
- Waitlist management not yet built
- Gift card / voucher system not yet built
- Franchise / white-label configuration not yet built

---

## Summary Status

| Layer | Status |
|-------|--------|
| Platform Foundation | ~80% — core infra built; observability and unified analytics pending |
| Stage 0 — Landing & Onboarding | ~85% — all key sections built; role-based entry and SEO gaps |
| Stage 1 — Discovery & Enquiry | ~70% — catalogues and detail pages built; unified search and comparison pending |
| Stage 2 — Account Experience | ~60% — booking and profile built; comms, document wallet, requests tracker pending |
| Stage 3 — Operations | ~70% — core admin built; KYC, quotes, payouts, audit UI pending |
| Stage 4 — Specialised | ~50% — multi-branch and practitioner model built; loyalty, compliance, waitlist pending |
