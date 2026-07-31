# KRITVA — Photography MVP: Build Specification

**Read `build.md` first.** That document decides *what* Kritva is and *why photography is first*. This one decides *what gets built*, screen by screen, click by click.

**Audience:** the person writing the code.
**Companion:** `mvp-photography-plain.md` — the same screens and flows in plain English, for validating with Keshav and with real photographers before any of it is built.

**Rules this document follows:**
- Every claim about existing code was read from the repo on 30 Jul 2026 and cites a file.
- Every number is a *design decision* (a limit we choose), never a market claim. There are no invented statistics.
- Anything unknown is listed in §11 as unknown, not guessed.

---

## 1. Scope

**Goal:** an organiser in Delhi-NCR can find a photographer, negotiate, pay, receive the delivery, and release the money — and that photographer's bank account actually receives it. One category, one city, one payment, one release.

**In scope**

| | |
|---|---|
| Categories | `photography` only |
| City | `delhi-ncr` only |
| Contract type | `direct` only (§2 of `build.md`) |
| Payment | Single full payment held, single release |
| Roles | customer, vendor, admin |
| Dispute handling | Admin doesn't press release. No console. |

**Out of scope — deliberately**

Quotes and comparison (that's catering, phase 2), multi-milestone payments, budget planner, compliance checklist, events-as-containers, reviews, in-app chat, matching algorithms, AI, mobile apps, multi-city.

**Definition of done — the only one that counts:**

> A photographer we did not personally set up receives money in their bank account through Kritva, for a job booked by a customer we did not personally set up.

Everything in this document is scaffolding around that sentence.

---

## 2. Ground truth found on 30 Jul 2026

Read from the code today. Four of these change the plan, so they lead.

### 2.1 `vendor_availability` exists and nothing uses it

`packages/db/src/schema/vendors.ts:183` and `packages/db/migrations/002_vendor_domain.sql:102` define a per-date availability table, indexed on `(vendor_id, date)`, with a `booking_id` column for auto-blocking when a booking is accepted. The migration comment even describes that behaviour.

**There is no API touching it and no UI for it.** `GET /v1/vendors` (`routes/vendors.ts:145`) has no date parameter at all — it filters on category, city, text search and price only.

So "show me photographers free on 14 February" — the single most natural thing an organiser asks — is currently impossible, but the hard part (the schema) is already done. This is the highest-value, lowest-cost gap in the codebase.

### 2.2 There is no payment webhook, and this is a live data-loss bug

`POST /v1/payments/verify-payment` (`routes/payments.ts:292`) does verify the Razorpay signature server-side, which is correct. But it is only ever called **by the browser** after checkout returns.

If the customer's tab closes, crashes, or loses network in the two seconds after paying, Razorpay has the money and Kritva's booking is stuck in `payment_pending` forever. The customer has paid and the system doesn't know.

`packages/payments/src/webhooks.ts` is 3 lines and empty. **This must be built before a single real rupee moves.**

### 2.3 Vendor onboarding is gated behind a hard checklist

`packages/api/src/lib/vendor-discoverability.ts` requires, before a vendor appears in search at all:

- ≥1 category, ≥1 active package, a profile photo, **and ≥5 portfolio photos**

This is enforced identically in `computeVendorReadiness` (`lib/vendor-readiness.ts`). For photography this is defensible — a photographer without 5 sample photos is not sellable. Keep it for this MVP. Note it will need relaxing when catering arrives, since a caterer's portfolio isn't the point.

### 2.4 Route protection only covers `/admin`

`apps/web/middleware.ts` has `matcher: ["/admin", "/admin/:path*"]`. Customer and vendor pages have no server-side auth guard — they rely on client-side `use-require-auth`. The API is properly guarded by `supabaseAuth()` on every route, so this is a UX and information-leak problem rather than a data breach. Fix in Milestone 0.

### 2.5 Other facts worth having in front of you

- **UI kit is thin.** `apps/web/components/ui/` has only `badge, button, card, dialog, dropdown-menu, input, tooltip`. No form, select, textarea, tabs, table, calendar, skeleton, avatar, separator, or toast. Several screens below need these — that's real work, listed in Milestone 0.
- **No toast system.** `app/(platform)/dashboard/page.tsx:345` uses `alert()` for "Funds released to vendor!".
- **Milestones are already single-payment.** `seedFullPaymentMilestone` (`routes/bookings.ts:88`) creates one `advance` milestone at 100% labelled "Full Payment", seeded on vendor accept. This matches the MVP scope exactly — no change needed.
- **Price snapshots are server-built.** `POST /v1/bookings` re-reads `vendor_packages` and constructs `package_details` itself rather than trusting the client's prices. This is correct and important. Preserve it.
- **Notifications are email-only.** `packages/notifications/src/dispatcher.ts` handles 4 event kinds via email. `sms.ts` and `push.ts` are 2-line stubs. There is no WhatsApp integration.
- **Mock endpoints are still live.** `routes/payments.ts:405–631` return `"mock_pay_12345"`. Delete in Milestone 0.
- **Three seeded demo vendors** are flagged by slug in `vendor-discoverability.ts` (`spice-route-caterers`, `aperture-stories`, `the-orchid-estate`) and surface as `is_mock: true`.

---

## 3. System architecture

### 3.1 Shape

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (mobile-first — vendors are on phones)              │
│  Next.js App Router · React · TanStack Query · Tailwind      │
└───────────────┬──────────────────────────────────────────────┘
                │  apiClient (lib/api-client.ts) — Bearer token
                │  Supabase JS — auth only
                ▼
┌──────────────────────────────────────────────────────────────┐
│  API — Hono (packages/api) on Railway                        │
│  supabaseAuth() middleware → every route                     │
│  routes: auth · vendors · bookings · payments · admin        │
└───────┬───────────────────────┬──────────────────────────────┘
        │                       │
        ▼                       ▼
┌───────────────┐   ┌──────────────────────────────────────────┐
│ Postgres      │   │ External                                 │
│ (Supabase)    │   │ · Supabase Auth (identity)               │
│ Drizzle + RLS │   │ · Supabase Storage (photos)              │
│ 18 migrations │   │ · Razorpay Orders  → money in            │
└───────────────┘   │ · Razorpay Route   → money out  [TO ADD] │
                    │ · Resend/SMTP      → email               │
                    │ · WhatsApp         → manual, by Keshav   │
                    └──────────────────────────────────────────┘
```

Web deploys to Vercel (`apps/web/vercel.json`), API to Railway (`railway.toml`, `nixpacks.toml`). Keep this — it works and it's not where the risk is.

### 3.2 The rules that hold it together

**Money never moves on a client's word.** The browser may *initiate*. Only a Razorpay webhook, verified by signature server-side, may change a booking's payment state. §2.2 is the current violation.

**Every state change is written to `booking_events`.** Append-only, never updated. This table is your dispute evidence, your debugging tool, and eventually your metrics. It already works — don't bypass it when adding new transitions.

**Prices are snapshotted server-side at inquiry.** Already true. A vendor changing their package price tomorrow must not change yesterday's booking.

**Money is paisa integers everywhere.** Already true.

**Idempotency.** Payment capture already guards on `status = 'payment_pending'` inside the UPDATE's WHERE clause (`payments.ts:66`), so a double-call can't double-capture. Apply the same pattern to release: guard on `payment_held`, and store Razorpay's transfer ID so a retry can detect the transfer already exists.

### 3.3 State machine actually used by this MVP

Of the 13 states in `packages/types/src/enums.ts:13`, photography uses 11. `vendor_reviewing` is optional (set it when the vendor opens the lead — useful signal, no gate).

```
                    ┌──────────────────────► vendor_declined  (terminal)
                    │
inquiry ──► vendor_reviewing ──► vendor_accepted ──► payment_pending
                    │                    ▲                 │
                    └──► vendor_countered ┘                 │  webhook
                              │  customer accepts           ▼
                              └──► customer_confirmed   payment_held
                                                             │  event date
                                                             ▼
                                                        in_progress
                                                             │  vendor uploads proof
                                                             ▼
                                                         completed
                                                             │  customer approves / auto
                                                             ▼
                                                     payment_released (terminal)

Any funded state ──► disputed (freeze)     Any pre-payment state ──► cancelled
```

Two notes. `customer_confirmed` and `vendor_accepted` both lead to `payment_pending` — one via counter, one direct. And `in_progress` should be set by a scheduled job on the event date, not by anyone clicking anything.

### 3.4 Payment modes — build and demo everything without real money

**Decision (30 Jul 2026):** the entire payment system is built once and runs in one of two modes, selected by a server-side environment variable. In `simulated` mode nothing reaches Razorpay, but every other line of code executes exactly as it does in production.

```
PAYMENT_MODE = "live" | "simulated"
```

**Never `NEXT_PUBLIC_`.** Read once at boot, on the server, and logged loudly at startup. A client must have no way to influence it, request it, or infer it from an API response.

#### Why this matters more than it looks

It removes Razorpay Route approval from the critical path. Previously the whole money half of the product waited on a third party's paperwork. Now the product can be finished, deployed and demonstrated end to end, and Route approval becomes a *launch* dependency instead of a *build* dependency. That is a genuine unblock, and it's the reason this section exists.

#### The shape — swap the adapter, not the endpoint

The failure mode to avoid is exactly what's in the code today: separate mock endpoints (`payments.ts:405–631`) returning `"mock_pay_12345"`, which bypass the real path entirely and therefore prove nothing about it. **Delete those.** Replace with one interface and two implementations.

```ts
interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  verifySignature(orderId: string, paymentId: string, sig: string): boolean;
  createLinkedAccount(vendor: VendorPayoutDetails): Promise<{ account_id: string }>;
  transfer(input: TransferInput): Promise<{ transfer_id: string; status: string }>;
  refund(input: RefundInput): Promise<{ refund_id: string; status: string }>;
  parseWebhook(rawBody: string, signature: string): WebhookEvent;
}
```

`RazorpayProvider` and `SimulatedProvider`. Selected once in `packages/payments/src/index.ts`. **Everything above this line is identical in both modes** — routes, booking transitions, `booking_events`, milestones, commission maths, reconciliation, notifications. That identity is the entire value: in simulated mode you are testing *your* logic, and the only untested surface is Razorpay's own API.

#### What the simulator must actually simulate

A simulator that always succeeds instantly is worse than none — it produces a system that works in the demo and fails on the first real transaction.

| Behaviour | Why it's required |
|---|---|
| **Delayed webhook** — sim provider POSTs a validly-signed event to your own `/v1/payments/webhook` after 2–5s | Exercises the authoritative path from §2.2. Without this the webhook code is never run before launch, which is how the same bug ships twice. |
| **Failed payments** — a "Fail this payment" control on the simulated checkout | Every failure branch stays dead code otherwise |
| **Signature mismatch** — an injectable bad-signature case | Proves rejection actually rejects |
| **Async settlement** — transfers report `pending`, flip to `settled` after a delay | Real settlement is not instant. If the UI assumes it is, it's wrong. |
| **Webhook replay** — same event delivered twice | Razorpay retries. Idempotency must be proven, not assumed. |

The simulated checkout is a **Kritva-hosted page** — clearly our own screen, plainly labelled as a test payment. Do not reproduce Razorpay's branding or interface to make the demo more convincing; imitating a real payment company's checkout is not something to have on a deployed site.

#### The five guards

Without these, a mode flag is a way to give away free bookings.

1. **`payments.mode`** — a non-nullable column on every payment row, `'live' | 'simulated'`, written at creation. The ledger must never be ambiguous about which rupees were real.
2. **Simulated mode can only book demo vendors.** `isMockVendor()` already exists in `lib/vendor-discoverability.ts`, keyed on three seeded slugs. Promote it to a `vendors.is_demo` column and enforce it in `POST /v1/bookings`. **This is the guard that matters most** — it makes it structurally impossible for a real photographer to be pulled into a booking where no money exists. Nobody real can be misled, because nobody real is reachable.
3. **Cross-mode operations are refused.** A server in `live` mode must reject any release, refund or transfer against a `mode = 'simulated'` row, and the reverse. Three lines of code, and it's the check that saves you the week after you flip the switch.
4. **Reconciliation and revenue reporting filter `mode = 'live'`.** Simulated rows must never enter a number you'd show anyone.
5. **Admin screens always mark simulated records**, regardless of any display setting. `/admin/bookings` showing a fake ₹45,000 as real held funds is precisely the confusion this whole section exists to prevent.

#### On demos

Because guard 2 confines simulated bookings to demo vendors, the customer-facing screens don't need a warning banner — an investor walkthrough can run clean and complete, right through to "released to the photographer", without any real person being deceived and without a fake transaction ever touching the ledger.

**Going live is then one env var and a Razorpay key.** No code path changes, because no code path was ever different.

---

## 4. The extensibility seam

You asked how to build photography without painting yourself into a corner. This is that answer, and it is three things.

### 4.1 Nothing in the URL says "photography"

Keep `/vendors`, not `/photographers`. Category is a query parameter — `GET /v1/vendors?category=photography` already works (`routes/vendors.ts:158`). The MVP just hard-defaults it. Adding catering later is changing a default, not a route.

### 4.2 The category config table

Build this in Milestone 0, with exactly one row in it. It costs an afternoon now and saves a rewrite later.

```ts
interface CategoryConfig {
  id: VendorCategory;
  contract_type: "direct" | "quote" | "allocated";
  pricing_units: PackageUnit[];       // which units this category may use
  quantity_label: string | null;      // "Hours"? "Plates"? null = no quantity
  brief_fields: BriefFieldSpec[];     // the questions the organiser answers
  proof_required: ProofSpec;          // what the vendor uploads to trigger release
  min_lead_time_days: number;
  min_portfolio_photos: number;       // 5 for photography; will differ
  commission_bps: number;             // admin-editable — see §4.4
}
```

The photography row:

```ts
{
  id: "photography",
  contract_type: "direct",
  pricing_units: ["flat", "per_day", "per_hour"],
  quantity_label: "Days",
  brief_fields: [
    { key: "coverage_hours",  label: "Hours of coverage",   type: "number", required: true },
    { key: "shooters",        label: "Photographers needed", type: "number", required: true },
    { key: "deliverables",    label: "What you need",        type: "multi",
      options: ["Edited photos", "Raw files", "Album", "Video", "Drone", "Same-day edit"] },
    { key: "delivery_days",   label: "Delivery deadline",    type: "number", required: false },
  ],
  proof_required: { type: "link_plus_note", label: "Gallery link" },
  min_lead_time_days: 3,
  min_portfolio_photos: 5,
}
```

**Every screen below reads its questions from this config.** No screen hardcodes "hours of coverage". When catering arrives, the same screens render plates and veg ratio, and `contract_type: "quote"` sends it down the multi-vendor path instead.

### 4.3 `bookings.origin`

Add the column now, set it to `'direct'` for every row. When quotes arrive, `'quote'` rows flow through the same state machine and the same booking detail screen. One engine, three shapes.

### 4.4 Commission — per category, admin-editable

**Decision (30 Jul 2026):** commission is set per category by an admin, from a screen. **Default 2%.** Deducted from the vendor's payout; the organiser pays no fee.

#### Storage

**Basis points, as an integer.** 2% = `200`. Never a float, never a percentage stored as `2.0` — floating-point maths on money is how ₹900 becomes ₹899.99999.

- `category_configs.commission_bps` — the live rate per category
- `platform_config.default_commission_bps` — fallback for a category with no override

**Note the existing seed is wrong for this plan.** `migrations/011_seed_platform_config.sql` sets `vendor_commission_pct: 8` and `customer_commission_pct: 0`. The 8 is an invented number from the AI-generated docs. Replace with `default_commission_bps: 200`. Also stale in that file: `default_milestones` (40/35/25) contradicts the single-payment MVP — `seedFullPaymentMilestone` already ignores it.

#### The rule that matters most

**Commission is snapshotted onto the booking when the vendor accepts, and release reads the snapshot — never the live config.**

```
bookings.commission_bps    -- written at PATCH /:id/accept, immutable thereafter
```

Without this, an admin raising the rate on Tuesday silently changes what a vendor gets paid for a job they agreed to on Monday. That is a trust failure a small vendor will never forgive, and arguably a breach of the agreed terms. **A rate change must apply only to bookings accepted after the change.** Same principle as the existing server-side price snapshot in `POST /v1/bookings` — and for the same reason.

#### Arithmetic

```
commission = floor(total_amount * commission_bps / 10000)   // paisa
vendor_payout = total_amount - commission
```

Compute the payout by **subtraction, never independently.** If both are calculated from percentages they will eventually fail to sum to the total, and you'll be short a paisa on a real transfer, which Razorpay will reject.

#### Visibility — non-negotiable

The vendor sees the deduction **before accepting**, on `/vendor/leads/[id]`:

> *"If you accept: ₹45,000 total → **₹44,100 to you** (Kritva fee ₹900)"*

And again as a line item on `/vendor/payouts` and the booking detail. **A vendor who expects ₹45,000 and receives ₹44,100 with no explanation is lost permanently**, even if the terms said so. Showing it costs nothing and buys the only thing that matters.

#### Audit

Every rate change writes to `audit_logs` via the existing `appendAuditLog` helper (`packages/api/src/lib/audit.ts`): who, when, old value, new value, category. This is one of the few settings that directly moves money, so the record is not optional.

---

## 5. Route map

Existing routes keep their paths. New ones are marked.

### Public
| Route | Purpose | Status |
|---|---|---|
| `/` | Marketing home | exists |
| `/vendors` | Discovery — defaults `category=photography` | exists, needs date filter |
| `/vendors/[slug]` | Vendor profile + booking form | exists, needs rework |
| `/login` · `/onboarding` | Auth | exists |

### Customer
| Route | Purpose | Status |
|---|---|---|
| `/dashboard` | My bookings | exists, needs rework |
| `/bookings/[id]` | Booking detail — the spine of the relationship | exists (969 lines), needs rework |

### Vendor
| Route | Purpose | Status |
|---|---|---|
| `/vendor` | Dashboard — leads, money, upcoming | exists, needs rework |
| `/vendor/profile` | Profile, packages, portfolio | exists |
| `/vendor/leads/[id]` | Respond to one enquiry | **NEW** |
| `/vendor/calendar` | Block and open dates | **NEW** |
| `/vendor/payouts` | Bank account + settlement history | **NEW** |

### Admin
| Route | Purpose | Status |
|---|---|---|
| `/admin` · `/admin/users` · `/admin/vendors/[id]` | Existing panels | exists |
| `/admin/bookings` | **Money control room** — held funds, releases, disputes | **NEW — critical** |
| `/admin/settings` | Commission per category, and the other money settings | **NEW** |

---

## 6. Screen specifications

Format for each: **purpose → data → contents → states → actions**.
"Cards" below means visual blocks, top to bottom, in priority order.

---

### 6.1 `/vendors` — Discovery

**Purpose:** get from "I need a photographer" to a shortlist of 3–4 without asking anything the user can't answer.

**Data:** `GET /v1/vendors?category=photography&city_id=delhi-ncr&date=&price_max=&q=&limit=12&offset=0`
`date` is new — see §7.1.

**Contents**

*Filter bar* — sticky on mobile. Four controls, no more:
1. **Date** — the primary filter. Drives availability.
2. **Budget** — max only. A slider or three buckets; do not ask for a range.
3. **Search** — free text, hits the existing `search_vector` tsquery.
4. **Sort** — Recommended (default: `avg_rating desc, booking_count desc`, already implemented) / Price low→high.

*Result grid* — 12 per page (`DEFAULT_PAGE_SIZE`, `routes/vendors.ts:141`). Each **vendor card** carries exactly seven things and nothing else:

| Element | Source | Rule |
|---|---|---|
| Cover image | `cover_image` (banner media) | 16:9, lazy, skeleton while loading |
| Business name | `business_name` | 1 line, truncate |
| Verified badge | `is_verified` | **Only if `verification_status = 'approved'`.** Never show a fake badge. |
| Rating | `avg_rating`, `rating_count` | **Hide entirely if `rating_count = 0`.** Do not render "0.0 ★" — an empty rating reads as a bad one. |
| Price from | `price_min` + `unit` | "From ₹25,000 per day". If `units_mixed`, show min only and append "onwards" |
| Availability | new `date` filter | "Free on 14 Feb" / "Booked" |
| Location | `location_name` | Area name only, never full address |

Existing `VendorCard.tsx` is 345 lines and already renders most of this.

*Empty state* — the most important state on this screen, because early on it will be the common one. It must never be a blank page. Show: "No photographers free on 14 Feb yet." + a *Show all photographers* button that drops the date filter + a *Tell us what you need* form capturing date, budget and requirement. **That form is a supply-gap signal and a lead for Keshav.**

**Actions:** tap card → profile. Change filter → refetch (debounce 300ms, keep in URL so results are shareable).

---

### 6.2 `/vendors/[slug]` — Vendor profile

**Purpose:** build enough trust to send an enquiry. This is where a stranger becomes bookable.

**Data:** `GET /v1/vendors/:idOrSlug` — returns vendor, packages, media grouped by section.

**Contents, in order**

1. **Hero gallery** — banner + portfolio. Minimum 5 photos (enforced by `vendorDiscoverableWhere`), recommend capping display at 12 with "View all". `HeroGallery.tsx` exists.
2. **Identity block** — name, verified badge, area, years in business, rating *(hidden at zero reviews)*, jobs completed *(hidden at zero)*.
3. **Packages** ⭐ — the decision-making block. Each package card:
   - Name, price with unit, min quantity if set
   - **Inclusions as a bulleted list** — `vendor_packages.inclusions` is `jsonb` and already exists. Make this mandatory in vendor onboarding: 3–6 lines. *This is the single field that prevents "what's actually included?" disputes, and it is the cheap version of the catering comparison grid.*
   - A "Select" affordance
4. **About** — description, `years_in_business`.
5. **Location** — area + embedded map. `LocationSection.tsx` exists. **Never the full street address before booking.**
6. **Reviews** — if any. Hide the whole block at zero rather than showing "No reviews yet", which reads as a warning.
7. **Enquiry form** — see 6.3.

**Hard rule:** no phone number, no email, no Instagram handle anywhere on this page. Not in text, not in an image caption. If contact details leak, the transaction leaves the platform and there is no product. Consider a server-side check that rejects 10-digit sequences in `description` and `inclusions`.

---

### 6.3 The enquiry form

**Purpose:** the organiser's "are you free on the 14th, what do you provide, how much" — in one structured pass.

**Replaces:** `MenuAndQuoteForm.tsx` (417 lines), which asks for package + quantity only and hardcodes catering-flavoured fields.

**Data:** `POST /v1/bookings` — schema `createBookingInquirySchema`. Fields already accepted: `vendor_id`, `package_details[]`, `event_date`, `event_type`, `guest_count`, `total_amount`, `notes`, `city_id`, `event_id`.

**Contents — three steps on mobile, one column on desktop**

*Step 1 — The event*
- Event date *(required, ≥ `min_lead_time_days` ahead)*
- Event type — wedding / reception / corporate / college fest / hackathon / birthday / other. This is `EVENT_TYPES` (`enums.ts:68`), which today has 5 values and needs the fest/hackathon additions.
- Venue area — text, optional

*Step 2 — What you need* — **rendered from `brief_fields` in the category config, not hardcoded.** For photography: coverage hours, number of shooters, deliverables checklist, delivery deadline.

*Step 3 — Package and price*
- Package selector, quantity if the unit needs it (`packageUnitAllowsMinQuantity`, `enums.ts:134`)
- **Live total**, clearly labelled *"Indicative — the photographer will confirm"*
- Notes — free text, 500 chars
- Submit

**Where the structured answers go:** into the new `briefs` table (`build.md` §2.4), not into `notes`. `notes` stays free text. The brief must be structured at write time — this is the irreversible decision.

**States:** not logged in → save form to `sessionStorage`, send to `/login?returnTo=`, restore on return. Do not make them retype it. `buildLoginUrl` in `lib/booking-form.ts` already exists for this.

**On success:** do **not** bounce to a dashboard. Go to `/bookings/[id]` with a clear "Sent — [name] usually replies within X" line, and set expectations about what happens next. Momentum matters more than tidiness.

---

### 6.4 `/vendor` — Vendor dashboard

**Purpose:** a photographer standing in a car park, on 4G, one hand, ten seconds. Three things above the fold. Nothing else competes.

**Data:** `GET /v1/bookings?role=vendor` + a new `GET /v1/vendors/me/summary`.

**Contents**

1. **New leads** — the top card, always first, count in the heading. Each row: event date, event type, area, indicative amount, time since arrival. One tap → `/vendor/leads/[id]`. Empty state: "No new enquiries" plus the profile-completeness nudge if `readiness.complete === false`.
2. **Money** — three numbers, in this order and no others:
   - **Held for you** — funded, not yet released. *This is the number that makes the platform worth using. Give it the largest type on the screen.*
   - **Released this month**
   - **Awaiting your response** — value of open leads
3. **Next jobs** — today and the next 7 days. Date, event type, area, customer first name *(`customer_first_name` is already computed server-side at `routes/bookings.ts:47`)*.

Below the fold: a 14-day availability strip linking to `/vendor/calendar`, and the profile-readiness checklist from `GET /v1/vendors/me/readiness` if incomplete — the 4 checks with the missing ones actionable.

**Quality bar:** this page must be usable on a 360px screen and readable in sunlight. It is the page a vendor sees most often and the one that decides whether they open Kritva again.

---

### 6.5 `/vendor/leads/[id]` — Respond to an enquiry **(NEW)**

**Purpose:** accept, decline, or counter in under 60 seconds. This screen decides whether supply engages, and no other vendor screen matters as much.

**Data:** `GET /v1/bookings/:id` (exists, `routes/bookings.ts:1061`).

**Contents**

1. **The brief** — date, event type, area, and the structured answers rendered from the category config. Coverage hours, shooters, deliverables, delivery deadline. Readable at a glance, not a wall.
2. **Calendar check** — automatic, from `vendor_availability`. Green: "You're free on 14 Feb." Amber: "You have another job on 13 Feb." Red: "You're booked on this date."
3. **Their offer** — the package they picked, the indicative total, and **what he'd actually receive**:
   > *₹45,000 total → **₹44,100 to you** (Kritva fee ₹900)*

   Computed from the category's current `commission_bps` (§4.4) and snapshotted onto the booking the moment he accepts. Never show the gross alone.
4. **The three actions:**

| Action | API | Then |
|---|---|---|
| **Accept** | `PATCH /v1/bookings/:id/accept` | Milestone seeded, **`commission_bps` snapshotted**, customer notified, date auto-blocked in `vendor_availability` |
| **Counter** | `PATCH /v1/bookings/:id/counter` | Amount + message. **Present as "Suggest a different price", not "Counter-offer" — plain language wins.** |
| **Decline** | `PATCH /v1/bookings/:id/decline` | **Reason is required** — date unavailable / below minimum / outside area / not my style. These reasons are the only supply-gap data you will ever get for free. |

All three endpoints exist and work. This screen is pure UI over logic that's already correct.

**Quality bar:** thumb-reachable buttons, no horizontal scroll at 360px, works on a slow connection. If a photographer can't respond while walking, they'll respond on WhatsApp instead and the platform is bypassed.

---

### 6.6 `/vendor/calendar` — Availability **(NEW)**

**Purpose:** make the date filter on `/vendors` trustworthy. A stale calendar is worse than no calendar.

**Data:** new `GET/PUT /v1/vendors/me/availability` over the existing `vendor_availability` table.

**Contents:** month grid. Four day states — **open** (default), **blocked** (vendor set it), **booked** (auto-set, `booking_id` populated, not editable), **past** (greyed). Tap toggles open ↔ blocked; drag or tap-range for a holiday.

**Rules:** accepting a booking auto-blocks the date — the migration comment at `002_vendor_domain.sql:117` already describes this. Cancelling frees it. Vendors cannot manually unblock a booked date.

**Freshness:** show "Updated 12 days ago" on the vendor dashboard and nudge monthly. If nobody keeps this current, remove the date filter rather than let it lie — a wrong "Free on 14 Feb" is worse than no answer.

---

### 6.7 `/dashboard` — Customer bookings

**Purpose:** what needs my attention, and what have I already sorted.

**Data:** `GET /v1/bookings?role=customer`.

**Contents**

1. **Needs your attention** ⭐ — first, always. Only bookings with a pending action:
   - `vendor_accepted` → "Accepted — pay to confirm" → **Pay** button
   - `vendor_countered` → "Suggested ₹X instead" → **View**
   - `completed` → "Delivered — review and release" → **with the auto-release countdown visible**
   Empty here is a *good* state: "Nothing needs you right now."
2. **Waiting on the photographer** — `inquiry`, `vendor_reviewing`, with time elapsed.
3. **Confirmed** — `payment_held`, `in_progress`. Date, name, amount, "Paid and held safely".
4. **Done** — `payment_released`, `cancelled`, `vendor_declined`. Collapsed by default.

The existing page (606 lines) has the right sections; it needs the attention-first ordering, and `alert()` at line 345 replaced with a real toast.

---

### 6.8 `/bookings/[id]` — Booking detail ⭐

**Purpose:** the spine. Everything after "I'd like to book you" happens here, for both parties, on one URL with role-aware rendering.

**Data:** `GET /v1/bookings/:id` — already returns milestones and the `booking_events` timeline.

**Contents**

1. **Status banner** — one plain sentence and one action. Never jargon. `payment_held` renders as *"Paid. Held safely until the job is done."* — not "Payment Held".
2. **Money card** — amount, what state it's in, and the single available action:

| Status | Customer sees | Vendor sees |
|---|---|---|
| `vendor_accepted` | **Pay ₹X to confirm** | "Waiting for payment" |
| `payment_held` | "₹X held safely. Released when the job's done." | **"₹X is funded and held for you."** ← the whole pitch |
| `completed` | Proof + **Release** + **Something's wrong** + *"Releases automatically in Nh"* | "Delivered — waiting for approval" |
| `payment_released` | Receipt | "₹Y paid to your account ••1234" |
| `disputed` | "On hold — we're looking into it" | same |

3. **What was agreed** — the brief and package snapshot from `package_details`. Immutable. This is the contract, and it is what an admin reads when the two parties disagree.
4. **Negotiation** — if countered: original, suggested, message, and **Accept / Decline**. Make this visible and normal. Haggling already works in the API (`/:id/counter`, `/:id/accept-counter`) — surfacing it is what stops people finishing the deal on WhatsApp.
5. **Delivery** — vendor uploads proof (gallery link + note, per `proof_required`); customer sees it and approves.
6. **Timeline** — from `booking_events`. Human sentences: "You sent an enquiry · 2 Aug", "Ravi suggested ₹45,000 · 3 Aug".
7. **Contact** — **only after `payment_held`.** Phone numbers appear here and nowhere else, ever.

The existing 969-line page has the data plumbing. It needs restructuring around "one clear state, one clear action" and the role-aware split.

---

### 6.9 `/vendor/payouts` — Bank account and settlements **(NEW)**

**Purpose:** get the vendor's bank details in, safely, and show them what they've been paid.

**Contents**

1. **Bank account** — account number, IFSC, name. Creates a Razorpay linked account (`bank-accounts.ts`, currently empty). Verified/pending state shown.
   **Fraud control: changing bank details pauses payouts pending re-verification.** Explain this on screen rather than hiding it — a vendor who understands the control trusts it; one who is silently blocked calls you angry.
2. **Held for you** — per booking, with the expected release trigger.
3. **Settled** — date, amount, booking, **Kritva's commission shown as a line item, not deducted silently**, and the bank reference once available.

**Gate:** a vendor cannot accept a booking without a verified bank account. Prompt at accept time, not at signup — asking for bank details before they have any work is how you lose them.

---

### 6.10 `/admin/bookings` — Money control room **(NEW — the most important new screen)**

**Purpose:** you are the escrow. This is the panel where you act as it.

**Contents**

1. **Held funds** — every booking in `payment_held` / `completed`. Amount, both parties, event date, days held, auto-release countdown. Sorted by urgency.
2. **Needs a decision** — disputes and anything past its auto-release with an unresolved flag. Full context on one screen: the agreement, the timeline, the proof, both parties' history. Three buttons — **Release** / **Refund** / **Split** — each requiring a written reason that is stored and shown to both parties.
3. **Reconciliation** — Kritva's Razorpay balance vs the sum of held bookings. **These two numbers must match every day.** When they don't, something is wrong and you need to know before a customer tells you.
4. **Supply gaps** — searches with no results, and decline reasons grouped. Feeds Keshav's week.

Boring, unglamorous, and the first thing that saves you in a crisis.

---

### 6.11 `/admin/settings` — Platform settings **(NEW)**

**Purpose:** change the numbers that govern money without a deploy. Superadmin only.

**Data:** new `GET/PATCH /v1/admin/settings`, over `category_configs` and `platform_config` (both tables already exist).

**Contents**

**1. Commission by category** — the main block. One row per category:

| Category | Contract type | Commission | |
|---|---|---|---|
| Photography | Direct | `2.00` % | *Save* |
| Catering | Quote | `2.00` % | *Save* |
| Venue | Direct | `2.00` % | *Save* |

Per row: a percentage input accepting two decimals, stored as basis points (`2.00` → `200`). Beside it, a **live worked example** so the number is never abstract:

> *On a ₹45,000 booking: Kritva ₹900, vendor ₹44,100*

Below the table, in plain language and not in small print:

> **Changing a rate affects only bookings accepted from now on.** Bookings already accepted keep the rate they were accepted under.

**2. Money rules** — auto-release window (hours), minimum lead time, cancellation refund scale. Same treatment: a worked example under each.

**3. Change history** — the last 20 changes from `audit_logs`: who, when, what moved from what to what. Reads back the audit trail rather than just writing it, which is the only way to know the logging actually works.

**Guards**
- Superadmin only, enforced server-side by `requireAdmin` (`lib/require-admin.ts`)
- Reject anything outside 0–30%. A typo of `20` for `2` is a five-figure mistake, and there is no reason to ever permit it
- Changes above 5% require re-entering the value to confirm
- Every write goes through `appendAuditLog`

**States:** saving per row, not a global save button — one mistake shouldn't be able to rewrite every category at once.

---

## 7. Click flows

### 7.1 Customer books a photographer

```
Home → "Find photographers"
  └─ /vendors?category=photography&city_id=delhi-ncr
       ├─ set date 14 Feb            → GET /v1/vendors?...&date=2027-02-14
       ├─ set budget max ₹60,000     → refetch
       └─ tap card                   → /vendors/aperture-stories
            ├─ browse portfolio, read package inclusions
            └─ "Request booking"
                 ├─ [not logged in] → /login?returnTo=... → back, form restored
                 ├─ Step 1 event → Step 2 requirements → Step 3 package
                 └─ Submit         → POST /v1/bookings           [inquiry]
                      └─ /bookings/[id] "Sent — usually replies within X"

  ── vendor accepts ──────────────────────────────────────────────
  Email + WhatsApp (manual) → /bookings/[id]
    └─ "Accepted. Pay ₹45,000 to confirm."
         └─ Pay → POST /v1/payments/create-order         [payment_pending]
              └─ Razorpay checkout
                   ├─ browser returns → POST /v1/payments/verify-payment
                   └─ RAZORPAY WEBHOOK → capture          [payment_held]  ← authoritative
                        └─ "Paid. Held safely." + photographer's contact revealed

  ── event happens ───────────────────────────────────────────────
  scheduled job on event_date                              [in_progress]
  vendor uploads gallery link + note                       [completed]
    └─ customer: Release  ──► POST /v1/payments/release    [payment_released]
       or:       Something's wrong ──►                     [disputed]  money frozen
       or:       N hours pass ──► auto-release job         [payment_released]
```

**The one branch that must be right:** the webhook is authoritative, the browser return is a convenience. If both fire, the capture is idempotent and the second is a no-op. If only the webhook fires, the customer still sees a paid booking. If only the browser fires — that's today's behaviour, and it's the bug in §2.2.

### 7.2 Vendor responds

```
WhatsApp from Kritva (Keshav sends manually at first)
  "New enquiry — wedding, 14 Feb, Dwarka, ~₹45,000. [link]"
    └─ /vendor/leads/[id]              (login if needed)
         ├─ brief · calendar check · their offer
         └─ one of three:
              ├─ Accept  → PATCH /:id/accept    → milestone seeded, date blocked
              │             └─ bank account missing? prompt here, before confirming
              ├─ Suggest a different price → PATCH /:id/counter  → amount + message
              └─ Decline → PATCH /:id/decline   → reason REQUIRED

  after accept → /vendor → "₹45,000 held for you" once the customer pays
  after event  → upload gallery link + note      [completed]
  after release→ /vendor/payouts, commission shown as a line
```

### 7.3 Something goes wrong

```
/bookings/[id] → "Something's wrong"
  ├─ pick a reason (not delivered / partial / quality / other)
  ├─ describe it, attach evidence
  └─ POST → [disputed] — money frozen immediately, before anyone reviews
       ├─ both parties emailed
       ├─ vendor can respond on the same page
       └─ /admin/bookings → Release / Refund / Split + written reason
            └─ both parties notified with that reason
```

No console, no workflow engine. One admin, three buttons, a mandatory reason.

---

## 8. What must work *properly*

The quality bar. A screen that renders isn't a screen that works.

**Money — zero tolerance**
- [ ] Webhook is authoritative; browser return is convenience only
- [ ] Every payment mutation is idempotent and guarded in the SQL `WHERE`, not in JS
- [ ] Release stores Razorpay's transfer ID; a retry detects the existing transfer
- [ ] Commission is in **integer basis points**, never a float
- [ ] `bookings.commission_bps` is snapshotted at accept and never re-read from config at release
- [ ] Vendor payout is computed by **subtraction** — commission + payout always equals the total exactly
- [ ] The vendor sees the deduction **before** accepting, and again on the payout screen
- [ ] Rate changes are rejected outside 0–30% and always written to `audit_logs`
- [ ] Held total reconciles against the Razorpay balance daily
- [ ] Every payment state change lands in `booking_events`
- [ ] Mock endpoints (`payments.ts:405–631`) deleted — replaced by the adapter, not kept alongside it

**Payment modes (§3.4)**
- [ ] `PAYMENT_MODE` is server-side only, never `NEXT_PUBLIC_`, never client-influenceable
- [ ] Mode is logged loudly at boot
- [ ] `payments.mode` non-nullable on every row
- [ ] Simulated mode can only book `is_demo` vendors — enforced server-side in `POST /v1/bookings`
- [ ] Live mode refuses to act on simulated rows, and vice versa
- [ ] Reconciliation and any reported figure filter `mode = 'live'`
- [ ] Admin screens always mark simulated records
- [ ] The simulator exercises the delayed webhook, failure, replay and async settlement — not just the happy path
- [ ] The simulated checkout is visibly Kritva's own page, not a copy of a payment provider's

**Every screen**
- [ ] Loading state — skeleton, never a spinner on a blank page
- [ ] Empty state — always says what to do next, never just "No data"
- [ ] Error state — retry button, plain language, never a raw API message
- [ ] Works at 360px, one-handed
- [ ] No `alert()` anywhere

**Trust**
- [ ] No contact details anywhere before `payment_held` — verified with a server-side check on free-text fields
- [ ] Verified badge only when `verification_status = 'approved'`
- [ ] Ratings hidden at zero rather than shown as 0.0
- [ ] Demo vendors (`is_mock`) clearly marked or excluded in production

**Language** — the whole product, one rule: **write what a person would say.** "Paid — held safely until the job is done", not "Payment Held". "Suggest a different price", not "Submit counter-offer". "Something's wrong", not "Raise dispute". Vendors will read these on a phone, quickly, in their second or third language.

---

## 9. Before you write any code

Short list, because §3.4 removed the blocking items.

**Nothing here blocks the build.** With `PAYMENT_MODE=simulated`, every milestone in §10 can be completed, deployed and demonstrated without a single external dependency being resolved. The items below are needed before *launch* — before a real customer pays a real photographer — not before code.

1. ~~**Commission rate.**~~ **Settled:** per category, admin-editable at `/admin/settings`, default **2%**, deducted from the vendor's payout. See §4.4.
2. **Auto-release window.** Goes into the terms and onto the booking screen. Make it config, pick a starting value, watch it behave.
3. **Cancellation policy** — refund percentages by days remaining, and who absorbs the gateway fee on a refund. Needed for `refunds.ts` to do anything meaningful, though the code path can be built and simulated first.
4. **Razorpay Route application.** Still weeks of lead time, still worth starting early — but it is now a **launch** blocker, not a build blocker. Start it whenever; don't wait on it.
5. **Terms of service and privacy policy.** You will hold ID documents and instruct money movement. Needed before real users, and an incubator will ask.
6. **Show `mvp-photography-plain.md` to three real photographers.** Would you reply to that WhatsApp message? Would you accept on that screen? Would you give bank details before the customer pays? Fifteen minutes each, and it can redirect six weeks of work. This is the only item here worth doing *before* building, and it costs an afternoon.

---

## 10. Build sequence

Each milestone ends in something demonstrable. Don't start the next until the last one is true.

**Milestone 0 — Foundations** *(nothing user-visible; do not skip)*
- Delete the mock payment endpoints (`payments.ts:405–631`)
- `PAYMENT_MODE` env, the `PaymentProvider` interface, and provider selection at boot (§3.4)
- Extend `middleware.ts` matcher to `/dashboard`, `/bookings`, `/vendor`
- Add the missing shadcn primitives: form, select, textarea, tabs, table, calendar, skeleton, avatar, separator, toast
- Migrations: `category_configs` (one row, `commission_bps: 200`), `bookings.origin`, `bookings.commission_bps`, `briefs`, `vendors.user_id` nullable, `vendors.is_demo`, `payments.mode`
- Correct the stale seed in `011_seed_platform_config.sql`: `default_commission_bps: 200`, drop `vendor_commission_pct: 8` and the 40/35/25 milestone split
- Add `date` to `GET /v1/vendors` + `GET/PUT /v1/vendors/me/availability`
- ✅ *Demo:* a date filter that actually filters

**Milestone 1 — Money, end to end, simulated** *(the critical path — do it before the pretty screens)*
- `SimulatedProvider` first: simulated checkout page, delayed webhook, failure injection, async settlement, replay
- `webhooks.ts` → signature-verified, idempotent, **authoritative** (fixes §2.2)
- `bank-accounts.ts`, `transfers.ts`, `commission.ts`, `refunds.ts` — written against the interface, exercised via the simulator
- The five guards from §3.4
- `/vendor/payouts`, `/admin/bookings`, `/admin/settings`
- `RazorpayProvider` — the same interface, filled in whenever Route is approved
- ✅ *Demo:* **a booking goes from enquiry to "released to the photographer" with money tracked correctly at every step, on the deployed site.** Presentable to anyone. Flipping to real money later is one env var.

**Milestone 2 — The vendor loop**
- `/vendor/leads/[id]`, `/vendor/calendar`, `/vendor` rebuilt
- ✅ *Demo:* a photographer responds to a lead on their phone in under 60 seconds

**Milestone 3 — The customer loop**
- `/vendors` with date filter and real empty state, profile rework, three-step enquiry form, `/dashboard` attention-first, `/bookings/[id]` rebuilt
- ✅ *Demo:* end to end, no admin intervention

**Milestone 4 — Make it real**
- Auto-release job, `in_progress` scheduler, dispute freeze, delivery proof, notification emails for every transition, reconciliation
- ✅ *Demo:* the first booking from a photographer neither of you personally onboarded

**Milestone 5 — Go live** *(gated on Razorpay Route approval, not on code)*
- Fill in `RazorpayProvider` against the interface Milestone 1 established
- Run one real ₹100 booking end to end in `live` mode
- Verify the cross-mode guard actually refuses a simulated row, and that reconciliation matches Razorpay's balance
- ✅ *Demo:* **a real photographer's bank account receives real money.** This is the moment Kritva becomes a business, and by design it is a switch-flip rather than a build.

---

## 11. Still unknown

Not guesses — actual open questions and who answers them.

None of these block the build. All of them are answerable while it proceeds.

| Question | Who / how | Blocks |
|---|---|---|
| Cancellation refund scale | Decision, then written into terms | Launch |
| Auto-release window length | Decision, then written into terms | Launch |
| Which ID documents to require | `DOCUMENT_TYPES` exists; the policy doesn't | Launch |
| Razorpay Route approval | Application, weeks of lead time | Milestone 5 only |
| Whether vendors will give bank details before their first payout | Only found out by asking | Nothing |
| Whether photographers will keep a calendar current | Only found out by watching | Nothing |
| Whether WhatsApp Business API is worth it, or manual is fine | Revisit after ~20 leads | Nothing |

**Settled, not open:**
- **Category — photography.** Not contingent on anything or anyone. Catering follows, with the quote flow, once the photography loop is complete.
- **Commission — 2% per category, admin-editable, deducted from the vendor's payout.** §4.4. Whether vendors accept it is still an empirical question, but the number and the mechanism are decided, and changing it is now a screen rather than a deploy.
