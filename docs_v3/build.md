# KRITVA — Build Document

**Audience:** the person writing the code (currently: Ishan, solo).
**Companion:** `plain.md` — same content, no jargon. For Keshav, incubators, vendors, and for you when the technical framing stops making the product feel real.

**Status of this document:** everything in §1 was read out of the repository and is verifiable. Everything in §2–§6 is a design decision made on 30 Jul 2026 and can be changed. Anything I don't actually know is in §8, marked as unknown rather than guessed.

**On the older docs:** `docs/` and `docs_v2/` were generated from a short description of the idea. Their personas and framing may well be right — Ishan judged the personas genuine — but every number, metric, target, timeline and market claim in them is invented and none of it should be repeated to an investor or written into a plan. This document contains no invented numbers. Where a number is needed and unknown, it says so.

---

## 1. Ground truth — what exists today

Read from the repo, not from memory or docs.

### Built and working

| Area | Where | State |
|---|---|---|
| Booking state machine | `packages/api/src/routes/bookings.ts` (1206 lines) | 13 states, real transition guards, append-only `booking_events` audit log |
| Negotiation | same file, `/:id/counter`, `/:id/accept-counter` | **Counter-offers are already first-class.** `counter_amount`, `counter_message` on `bookings` |
| Vendor domain | `packages/api/src/routes/vendors.ts` (1278 lines) | Profiles, packages, media, location, discoverability, readiness gating |
| Admin | `packages/api/src/routes/admin.ts` | User management, vendor verification queue, approve/reject |
| Auth | Supabase, `packages/api/src/middleware/supabase-auth.ts` | Role-based, `middleware.ts` in web app |
| Payment in | `packages/payments/src/orders.ts`, `routes/payments.ts` | Real Razorpay order creation + signature verification |
| Schema | `packages/db/migrations/000`–`017` | 18 migrations including RLS |

The 13 booking states in `packages/types/src/enums.ts:13`:
`inquiry → vendor_reviewing → vendor_accepted | vendor_declined | vendor_countered → customer_confirmed → payment_pending → payment_held → in_progress → completed → payment_released`, plus `disputed` and `cancelled`.

This state machine is good. It is the strongest asset in the codebase and nothing below asks you to change it.

### Stubs — declared but empty

```
packages/payments/src/transfers.ts       2 lines   // "Populated in T-021"
packages/payments/src/refunds.ts         2 lines
packages/payments/src/commission.ts      2 lines
packages/payments/src/bank-accounts.ts   2 lines
packages/payments/src/webhooks.ts        3 lines
```

**This is the critical finding.** Money can come *in* from a customer. There is no code path by which a vendor's bank account ever receives anything. The transaction loop is broken at the one step that makes Kritva a business rather than a form.

### Also incomplete

- Direct booking has no real UI/UX. `MenuAndQuoteForm.tsx` (417 lines) posts a booking, but the vendor-side response flow, the customer-side negotiation flow and the payment flow have no designed screens.
- `routes/payments.ts:405–631` still contains mock endpoints returning `"mock_pay_12345"` alongside the real Razorpay ones. Delete these before anything goes near a real user.
- `packages/api/src/routes/` is missing `reviews.ts` and `messaging.ts` at the router level even though schemas exist.
- No tests of substance (`tests/` exists, largely empty).

### Doesn't exist at all

Events-as-containers, RFQs, quotes, quote comparison, dispute console, vendor calendar, payouts UI, budget planner, compliance checklist. All are specified in `docs_v2/rough_trd.md` §6. None are in the code, and per §6 below, most should stay that way for now.

---

## 2. The core model

### 2.1 Contract type is a property of the category

This is the central design decision and everything else follows from it.

Kritva intends to cover the whole events industry. Different things bought for an event are bought in fundamentally different ways. Trying to force one booking flow across all of them is why the product has felt directionless.

Three contract types (Keshav's, derived from how events and gifting actually work):

**`direct`** — the organiser picks the vendor, picks the quantity, books.
Used when the thing is standardised and comparable as-listed.

**`quote`** — the organiser describes a requirement, several vendors respond with priced line items, the organiser compares and picks.
Used when the same headline price can mean very different things.

**`allocated`** — the organiser states quantity and budget; **a Kritva admin picks the supplier.**
Used when the buyer is indifferent to who fulfils it. *Note: "Kritva decides" means a human on the ops team decides. This is not an algorithm and should not be built as one.*

Mapping for the categories in scope:

| Category | Contract type | Pricing unit | Why |
|---|---|---|---|
| Photography | `direct` | `per_day`, `flat` | Sold as packages — hours, shooters, deliverables. Comparable as listed. |
| Venue | `direct` | `per_day`, `flat` | Fixed asset, fixed date. Available or not. |
| Catering | `quote` | `per_plate` | "₹850 a plate" is meaningless without menu, veg ratio, staff, crockery. Two identical numbers are different products. |
| Sweet boxes / gifting *(later)* | `allocated` | `per_item` | Buyer specifies quantity and budget, not supplier. |
| Décor *(later)* | `quote` | `flat` | Custom by definition. |

`PACKAGE_UNITS` in `packages/types/src/enums.ts:120` already contains `flat`, `per_plate`, `per_person`, `per_hour`, `per_day`, `per_item`. The pricing-unit axis is already half-modelled — this design formalises it.

### 2.2 Event type is a different, smaller axis

College fest, hackathon, E-cell summit, business meet, wedding, reception — these all need catering and photography. What changes between them is **which questions the brief asks**, not how booking or money works.

- Wedding catering brief asks: veg/non-veg ratio, live counters, serving style, baraat timing
- Hackathon catering brief asks: meal count over 36 hours, midnight snacks, dietary tags, delivery windows

Same engine, different question sheet. **Do not build a separate flow per event type.** Event type selects brief defaults and nothing else.

### 2.3 The category config

One table, not scattered conditionals. This is the brick that lets gifting, décor, transport and everything else be added later without a rewrite.

```ts
interface CategoryConfig {
  id: VendorCategory;
  contract_type: "direct" | "quote" | "allocated";
  pricing_unit: PackageUnit;
  brief_schema_id: string;      // which question set the organiser fills
  proof_required: ProofType[];  // what the vendor uploads to trigger release
  min_lead_time_days: number;
}
```

Add a new category = add a row and a question set. Not a new codebase.

### 2.4 Schema changes required

Small. The existing tables absorb this well.

1. **`bookings.origin`** — `direct | quote | allocated`. One column, and all three contract types live in the state machine you already built.
2. **`briefs`** — versioned structured requirement: `{ category, event_type, answers: jsonb, schema_version }`.
   **This must be structured at write time.** Comparison, matching and any future AI all depend on it. A text blob cannot be retrofitted into this. This is the one genuinely irreversible schema decision in the document.
3. **`quotes`** — line items keyed to brief requirement IDs, never a lump sum. The comparison view is impossible otherwise, and the comparison view is the differentiator for catering.
4. **`vendor.user_id` must be nullable.** You need vendor records that exist before the vendor has an account, so Keshav can send leads to people who haven't signed up. Currently vendor implies user.
5. **`category_configs`** — per §2.3.

Money stays in paisa integers throughout. It already does.

---

## 3. Money — Razorpay Route

### 3.1 The constraint

Kritva cannot hold customer funds. In India, holding money belonging to two other parties and settling between them requires an RBI Payment Aggregator licence. This is a legal fact, not a design preference, and it shapes the whole payment architecture.

### 3.2 The mechanism

Razorpay Route is built for exactly this. Razorpay holds the money; Kritva instructs when it moves.

```
1. Customer pays              → funds land in Kritva's Razorpay account (Razorpay custody)
2. Funds sit                  → vendor sees "funded", cannot access
3. Vendor delivers, uploads proof
4. Customer approves (or auto-approve window elapses)
5. Server calls Transfer API  → vendor's linked account gets amount − commission
6. Razorpay settles to vendor's bank
```

**A dispute is simply not making the transfer call.** The money stays in the Razorpay balance until an admin resolves it: release, refund, or split. That is the entire dispute mechanic at MVP — no console, no workflow engine, one admin and a button.

### 3.3 What to build, in order

| File | Contains | Note |
|---|---|---|
| `bank-accounts.ts` | Create Razorpay linked account per vendor | **Fraud surface.** Changing bank details must pause payouts pending re-verification. |
| `webhooks.ts` | Razorpay → Kritva event handling | **Build this before going live.** Never trust the browser's word that a payment succeeded — verify server-side via webhook. This is the most common way payment integrations get robbed. |
| `transfers.ts` | The release call | The thing that makes Kritva a business |
| `commission.ts` | Kritva's cut | Rate is an open decision — §8 |
| `refunds.ts` | Cancellation and dispute refunds | Needs a written cancellation policy first — §8 |

Then delete the mock endpoints at `routes/payments.ts:405–631`.

### 3.4 Two things to verify with Razorpay directly, not from this document

- **Route requires approval.** Razorpay reviews the business before enabling it, which takes days to weeks. **This is a launch dependency, not a build dependency** — see `mvp-photography.md` §3.4: the whole payment system is built once behind a provider interface and runs in a simulated mode until Route is live, so nothing waits on the paperwork. Start the application early anyway; just don't let it gate any code.
- **Held transfers.** Route supports creating a transfer in a held state (`on_hold`) as an alternative to not transferring at all. Which of the two approaches to use, and the exact parameters, must come from current Razorpay documentation or their support — not from this document. The simpler approach (don't call transfer until release) works and needs no special features.
- Settlement timing to the vendor's bank depends on the account configuration. Don't promise vendors a number until it's confirmed.

**Until Route is approved:** run pilot bookings with manual bank transfers to vendors. This is fine for a handful of pilot transactions. Do not describe it as escrow publicly, and do not build UI that implies automated custody before it exists.

---

## 4. The organiser → vendor flow

The flow to model is what people already do on WhatsApp, structured:

| What happens on WhatsApp | What the app does |
|---|---|
| "Are you free on 14 Feb?" | Date availability filter |
| "What all do you provide?" | Category-specific structured brief |
| "How much?" | Vendor quote, line-itemised |
| **"Can you do it for less?"** | **Counter-offer — already built** |
| "Also I need X" | Notes + revised quote |

**Negotiation is already in the codebase** (`/:id/counter`, `/:id/accept-counter`, logged to `booking_events`). Most marketplaces don't model haggling at all, which is exactly why Indian users go back to WhatsApp to do it. Make it a visible feature, not a hidden edge case. "Ask for a better price" should be a button.

### On WhatsApp itself

**Do not attempt to read vendors' WhatsApp inboxes.** The official WhatsApp Business API exposes only your own number's conversations, never a vendor's. Anything that could read their inbox is either a ToS violation that gets the number banned, or software on their device holding other people's private conversations — an unacceptable liability for a two-person company and a question an incubator will ask.

**Use WhatsApp as the notification layer instead.** Lead arrives → vendor gets a WhatsApp message from Kritva containing date, headcount and budget → the message has a link → the link opens Kritva, where he quotes. He installs nothing. He signs up only if he wins.

For the first batch of leads, Keshav sends these messages by hand. Build the link, not the integration.

What keeps both sides on-platform is not a feature: it is that the money is held and the agreed scope is on record. Nothing else holds anyone, and no amount of UI will.

---

## 5. Build order

The rule for deciding what to build, when the roadmap stops being obvious:

> **Finish one category to the point where a real vendor's bank account receives real money.** Everything that doesn't serve that is later.

### Phase 1 — Photography, end to end

Chosen first because:
- Package-based, so the existing `direct` booking model already fits — least new code
- Small photographers need leads; venues have power and don't
- Delivery is objectively checkable. Catering disputes are *"the paneer was cold"*, which cannot be adjudicated by a two-person team in year one.
- Ticket size is meaningful but a payout bug is not catastrophic

Scope: real UI for the whole existing state machine (inquiry → counter → confirm → pay → deliver → release), plus the five payment stubs, plus webhooks. One completed transaction with a real photographer is worth more than every screen specified in `docs_v2`.

### Phase 2 — Catering, with the quote flow

Structured brief → multiple vendors quote line items → comparison view flagging what one vendor omitted that others included. This is the actual differentiation, and catering is typically the largest line in an event budget.

### Phase 3 — Venue

Availability calendar. Deliberately last: venue owners have the most leverage and the least need for a platform.

### Later

Gifting (`allocated`, admin-operated), décor, event containers, reviews, compliance.

### Explicitly not building now

Milestone escrow with multiple tranches, dispute console, budget planner, compliance checklist, vendor calendar, payouts dashboard, matching algorithms, AI anything.

At MVP: **one payment, one release, one admin who doesn't press the button when there's a fight.**

---

## 6. Open decisions

Genuinely unknown. These need Keshav, a vendor conversation, or Razorpay — not a guess from this document. **None of them block the build** — see `mvp-photography.md` §3.4 and §9.

**Settled, not open:** the first category is **photography**, decided by us, contingent on nothing.

1. ~~**Commission rate.**~~ **Settled 30 Jul 2026:** per category, admin-editable from `/admin/settings`, **default 2%**, deducted from the vendor's payout, organiser pays nothing. Stored as integer basis points and snapshotted onto the booking at accept, so a rate change never alters an agreed job. See `mvp-photography.md` §4.4.
2. **Cancellation policy** — actual refund percentages by days remaining, and who absorbs the payment gateway's fee on a refund. Needed before `refunds.ts`.
3. **Auto-release window** after the vendor marks delivery. Needs to be in whatever terms both parties agree to.
4. **Razorpay Route approval status and timeline.** Affects launch date only — see `mvp-photography.md` §3.4.
5. **Whether vendors will accept a commission at all** — the only way to find out is Keshav asking them.
6. **Verification standard** — which documents are mandatory. `DOCUMENT_TYPES` exists (`pan`, `gst_certificate`, `business_registration`); the policy doesn't.

---

## 7. Reference — the invariants

Things that should not change regardless of what else does:

- Money in **paisa integers**, never floats
- Every booking state change goes through `booking_events` — append-only, never updated
- **Briefs are structured at write time**, never free text parsed later
- **Quotes are line items** against brief requirements, never lump sums
- Vendor records exist **before** vendor logins
- Category behaviour lives in **config**, not conditionals
- Payment success is confirmed by **webhook**, never by the browser
- `VENDOR_CATEGORIES` stays a **fixed enum**. Do not make it user-defined.
