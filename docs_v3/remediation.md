# KRITVA — Remediation List

**Produced 30 Jul 2026** from five parallel code reviews (architecture + schema drift, plan gaps, payments correctness, security, UX), synthesised and re-verified.

**Verification legend**
- ✅ **Verified** — I read the code myself and confirmed it. Act on these.
- ⚠️ **Relayed** — a review agent's finding, cited to a file, not independently re-read. Likely true; check before acting.
- ❓ **Needs an external answer** — cannot be settled from the repo.

**Two reviews independently found the same three money bugs** (client-supplied total, unbound order, no webhook) without seeing each other's output. That agreement is why those rank highest.

---

## P0 — Do today, before anything else

### 0.1 ✅ Delete the fabricated content on live public pages

`apps/web/components/vendor/profile/TestimonialsSection.tsx:4-20` hardcodes three testimonials from invented people — "Ananya Mehta", "Rahul Khanna", "Priya & Vikram Singh" — praising features that don't exist ("Fire NOC", "Kritva's compliance review", "Royal Decorators").

Mounted **five times**: `app/vendors/[slug]/page.tsx:107`, `:128`, `:205`, and `app/(vendor)/vendor/profile/page.tsx:363`. So every photographer who opens their own Kritva profile sees fake five-star reviews attached to it.

`apps/web/components/vendor/profile/AvailabilityWidget.tsx:7-8` — `OPEN_DAYS = {3,8,10,15,22,29}`, `BOOKED_DAYS = {5,12,18,25}`, hardcoded "Jul 2026", dead month arrows. Mounted on every public profile via `VendorProfileSidebar.tsx:23`. An invented calendar telling customers a photographer is free on days nobody chose.

Also delete: `VendorRatingSection.tsx:6-12` `PLACEHOLDER_RATING_BREAKDOWN` (currently dormant — delete so it can't be switched on), and the `"Unrated"` branch at `VendorCard.tsx:254-258`, which contradicts the "hide ratings at zero" rule for exactly the reason that rule exists.

**This is not a security bug — it's worse in one way.** The others need an attacker. This shows itself to every visitor, including the three photographers and any incubator.

### 0.2 ✅ Delete the two mock payment endpoints

`POST /v1/payments/initiate` (`payments.ts:409-514`) and `POST /v1/payments/simulate-capture` (`payments.ts:521-631`), mounted unconditionally at `index.ts:69`. No env gate, no role gate.

Any authenticated customer, on their own booking: `/initiate` → `payment_pending`, `/simulate-capture` → `payment_held` with a `payments` row claiming `status:'captured'`, `escrowStatus:'held'`, then `/release` → `payment_released`. The photographer's dashboard says the money is held. They shoot the wedding. **No money ever existed.**

**Correct deletion range is `payments.ts:405–631`, not 409–638.** My earlier docs said 409–638 six times; line 638 is `paymentsRouter.post(` for `/release`, a real endpoint spanning 633–874 that the whole flow depends on. Following the old instruction produced a syntax error and deleted the release path. Fixed in `build.md` and `mvp-photography.md` as of today.

### 0.3 ❓ Settle the RLS question with one query

`migrations/010_row_level_security.sql:27-30` — `users_update_own` constrains *which row* you may update, not *which columns*. `users.role` is in that row. Same shape on `vendors_update_own` (`:51-54`, self-issue a Kritva Verified badge) and `bookings_update_customer` (`:224-226`, `USING` with no `WITH CHECK` at all — set your own booking to `payment_held`).

✅ I grepped all 18 migrations: **there is no `GRANT`, `REVOKE`, or `FORCE ROW LEVEL SECURITY` anywhere.** Nothing has narrowed Supabase's default grants.

The anon key is in the browser bundle (`apps/web/lib/supabase.ts:9`) and addresses PostgREST directly, bypassing the Hono API entirely.

**Run this, then decide:**
```sql
select grantee, privilege_type from information_schema.role_table_grants where table_name='users';
```
Also check Supabase Dashboard → Settings → API → Exposed schemas.

If `authenticated` has write privileges and `public` is exposed, this is live privilege escalation to superadmin. **The fix is one migration and costs nothing**, because the web app only ever calls `supabase.auth.*` and `supabase.storage.*` — never PostgREST:

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
```

Keep the policies as defence in depth. The API connects as the table owner and bypasses RLS regardless, so this breaks nothing.

### 0.4 ✅ Decide what to do about `.gitignore`

`.gitignore:42` is `*.md` with only `!README.md` exempted. `git ls-files` returns three markdown files. **Every document in `docs_v3/`, `docs_v2/`, `docs/`, and `booking.md` is untracked** — they exist on this disk only. A fresh clone has none of them.

This may be deliberate. If it isn't, add `!docs_v3/**` before the next commit.

---

## P1 — Before writing any new feature code

The money cluster. All ✅ verified.

### 1.1 `total_amount` is client-supplied and never validated

`packages/types/src/booking.ts:49` accepts `total_amount: paisaSchema`; `bookings.ts:289` writes `totalAmount: total_amount` verbatim.

The server does careful work to build a trustworthy snapshot — verifies every `package_id` belongs to the vendor and is active (`bookings.ts:202-230`), stamps server-side prices into `packageSnapshots` (`:266-272`) — and then never sums them or compares.

POST `total_amount: 100` against a ₹45,000 package: the ₹1 flows into the milestone (`:408`), into `createOrder` (`payments.ts:216`), into the payout calculation. The vendor's only defence is noticing — and the accept row renders `formatPackageSummary`, which shows **package names only, no prices or quantities** (`apps/web/lib/booking-form.ts:68-73`).

**Fix:** compute `expectedTotal = Σ(pkg.price × quantity)` from the rows already fetched, and either drop `total_amount` from the schema or reject on mismatch.

**This corrects `mvp-photography.md` §2.5**, which told you prices were server-built and to preserve it. Half true — `package_details` is; the charged amount isn't.

### 1.2 The Razorpay order is never bound to the booking

`verify-payment` (`payments.ts:321-325`) verifies the signature over `(order_id, payment_id)`, then looks up the booking by a **client-supplied `booking_id`** (`:340-350`). The order ID is never persisted at create-order time — `createOrder` sets `receipt: booking_id` (`orders.ts:62`) and nothing ever reads it back. The amount is never checked either: `payments.ts:84` writes `booking.totalAmount`, not what Razorpay reported.

Pay ₹1 on a cheap booking, take the signature triple from devtools, replay against a ₹2,00,000 booking. It captures.

**Fix:** insert a `payments` row with `status='initiated'` and `gateway_order_id` at create-order time (the CHECK at `migrations/004:24` already permits `'initiated'` and it's never used). Resolve the booking *from that row*, never from the client. Assert the amount matches. Add `UNIQUE` on `gateway_payment_id` and `gateway_order_id` — migration 004 has neither.

### 1.3 No webhook — the authoritative path doesn't exist

`packages/payments/src/webhooks.ts` is 3 lines. `RAZORPAY_WEBHOOK_SECRET` is in `.env.example:17` and read by nothing.

Beyond the known tab-closes case, three consequences worth knowing:
- **The customer can't see it.** `payment_pending` appears in no dashboard bucket (`dashboard/page.tsx:352-365`). The booking they just paid for vanishes from their screen.
- **Neither can you.** Nothing is written at order creation, so there is no local record. Reconciliation is impossible, not merely unimplemented.
- **Double charge, silently swallowed.** `create-order` accepts `payment_pending` (`:183`) and mints a *new* order each call. Two tabs, two payable orders. The second `verify-payment` hits the JS early-return at `:40-42` and records nothing.

**Build notes not in the original plan:** the route must be mounted **outside** `supabaseAuth()`, must verify over the **raw body** (`c.req.text()`, not `c.req.json()`), and uses a **different secret** from `RAZORPAY_KEY_SECRET`. `webhook_events` already exists with `uq_webhook_idempotency UNIQUE (source, event_id)` (`migrations/004:122`) and has never had a query run against it.

### 1.4 State guards are in JavaScript, not in the SQL `WHERE`

Six transitions read → check in JS → issue a blind `UPDATE ... WHERE id = ?`:

| Transition | JS guard | Update predicate |
|---|---|---|
| accept | `bookings.ts:388` | `:403-406` — id only |
| decline | `:519` | `:534-541` — id only |
| counter | `:645` | `:660-668` — id only |
| accept-counter | `:744` | `:773-780` — id only |
| cancel | `:899` | `:920-924` — id only |
| admin verify | `admin.ts:535` | `:554-565` — id only |

`payments.ts` is the only file that does it right (`:66-72`, `:773-778`, `:804-809` — status inside the `WHERE`, `.returning()` checked). §3.2 of the plan cites that pattern; it has not been copied.

**Concrete failure:** a double-tapped Accept on a phone passes both JS guards and runs `seedFullPaymentMilestone` twice. `booking_milestones` has **no unique key on `(booking_id, name)`** (`migrations/003:117-136`). Capture then picks one with `.limit(1)` and **no `ORDER BY`** (`payments.ts:50-54`); release picks again, unordered (`:748-752`), and can release the *other* one. One milestone stuck `held`, one `released`, one payment.

**Fix:** guards into the `WHERE`, branch on `.returning()`, plus `UNIQUE (booking_id, name)` on `booking_milestones`. **Do this before the webhook** — the webhook is a second concurrent writer against exactly these rows and turns an unlikely race into a routine one.

### 1.5 The `0.08` in the live release path

`payments.ts:700` and `:838-840`: `Math.floor(booking.totalAmount * 0.08)` — the stale 8%, as a float, in the code that tells both parties what was deducted. Meanwhile `payments.platform_fee` is never written and stays at its column default `0` (`migrations/004:18`).

So the ledger records a ₹0 platform fee on a transaction where the API reported 8% deducted. §4.4 only told you to fix the seed file and never mentioned this code path.

### 1.6 Bans are cosmetic

✅ `auth.ts:36` is the **only** status check in the entire API, and it's inside `/sync`. `supabaseAuth()` does no DB read by design (`supabase-auth.ts:12`). A banned user's token keeps working on every other route — book, accept, upload, take payments.

**Fix:** status check in shared middleware after `supabaseAuth()`, and call Supabase's admin API to kill the session.

### 1.7 Once "Pay" is clicked, nobody can cancel

✅ `create-order` flips to `payment_pending` (`payments.ts:196-213`) *before* checkout renders. `payment_pending` is in neither `customerCancelStatuses` nor `vendorCancelStatuses` (`bookings.ts:888-893`). Abandon checkout → booking and the vendor's blocked date are stuck permanently. There is no admin booking endpoint to fix it.

### 1.8 There is no exit from `payment_held` other than paying the vendor

⚠️ If the event date passes and the photographer vanishes: money sits indefinitely. `BOOKING_STATUSES` has no `refunded` state, so §6.10's **Refund** and **Split** buttons have no representable end state — and no admin API to press them with.

**Decide now:** reuse `cancelled` plus a `bookings.escrow_outcome` column, or add `refunded` via migration (the CHECK at `migrations/003:69-70` must be altered).

---

## P2 — Milestone 0, revised

Replaces the Milestone 0 list in `mvp-photography.md` §10.

### 2.1 ✅ The UI kit is Base UI, not Radix

`apps/web/package.json:18` — `@base-ui/react ^1.5.0`, no `@radix-ui/*`. `components.json` sets `"style": "base-nova"`.

My instruction to "add the missing shadcn primitives" would pull **Radix** from the default registry: two portal systems, two focus traps fighting in one dialog, doubled bundle. **Pull from `base-nova` and verify each generated file's imports before committing.**

### 2.2 ✅ Tailwind v3/v4 syntax mismatch — focus rings don't render

`tailwindcss ^3.4.19` (`package.json:52`), but the primitives were authored against v4:

| Class | Where | Effect |
|---|---|---|
| `ring-3` | `button.tsx:7`, `input.tsx:12` | **No focus ring on any button or input.** v3's scale is 0/1/2/4/8. |
| `rounded-4xl` | `badge.tsx:8` | square corners |
| `data-open:` / `data-closed:` | `dialog.tsx:34,56`, `dropdown-menu.tsx:44` | animations never run |
| `**:`, `not-data-[…]:` | `dropdown-menu.tsx:116` | silently dropped |

Note `badge.tsx:8` uses `ring-[3px]` — correct v3 syntax. The files disagree with each other.

**One mechanical hour, and do it before generating nine more files that inherit the same dead classes.**

### 2.3 ✅ Three zod versions in one process

`packages/types` → `^3.23.8`, `packages/api` → `^4.4.3`, `apps/web` → `^3.25.76`. Every route validates with v3 schemas from `@kritva/types` — except `auth.ts:7`, which imports `zod` directly and builds on v4. Both get bundled into `dist/server.js`.

The six `parsed.error.errors[0]` sites in `vendors.ts` work only because those schemas are v3. Zod 4 renamed `.errors` → `.issues`. The day `@kritva/types` is bumped, every vendor validation error becomes `"Invalid request body"`.

**Fix:** pin one version in `pnpm-workspace.yaml`, next to the existing `@typescript-eslint` pins.

### 2.4 ⚠️ Remove `db:push` from `turbo.json`

✅ Confirmed exposed at `turbo.json:45` and `package.json:10`. With the schema drift below, running it against a real database drops four foreign keys, converts four `date` columns to `text`, strips four index predicates, and drops every CHECK constraint. **It is a data-loss button pointed at production.**

### 2.5 ⚠️ Schema drift — the "mirrors exactly" comments are false for four files

Accurate for `payments.ts`, `admin.ts`, `reviews.ts`. **False** for `users.ts`, `vendors.ts`, `bookings.ts`, `messaging.ts`.

Highest-value corrections:
- **Four missing `ON DELETE CASCADE` FKs** — `vendors.user_id`, `vendor_media.vendor_id`, `vendor_availability.vendor_id`, `vendor_documents.vendor_id`. Only `vendor_packages.vendor_id` keeps its `.references()`.
- **Four `date` columns declared as `text`** — including `vendor_availability.date`, the table the date filter is about to be built on. As `text`, `uq_vendor_date` compares strings and `'2026-2-14'` ≠ `'2026-02-14'`.
- ✅ **`bookings.package_details` default is `'{}'` in the live DB, not `'[]'`.** I confirmed `016_vendor_packages.sql:77` renames the column and never issues `SET DEFAULT`. A rename preserves the old default. Invisible today because every insert supplies the value — the first path that doesn't writes `{}` and `.map()` throws. Needs migration 018.
- `otp_requests.attempts` is `text` in Drizzle, `integer` in SQL.

### 2.6 ✅ The accept notification is a no-op

`packages/notifications/src/dispatcher.ts:213-214`:
```ts
case "booking_vendor_accepted":
  return;
```
Dispatched from `bookings.ts:421` and `:798`. **The customer is never told the vendor accepted** — the single handoff the whole MVP depends on. And nothing notifies the vendor of a new enquiry at all: `POST /v1/bookings` dispatches nothing.

### 2.7 Add `packages/api/src/config.ts` before `PAYMENT_MODE`

⚠️ Every env read in the API is an inline `process.env.X` at call time (`razorpay-client.ts:4`, `orders.ts:92`, `supabase-auth.ts:53`, `client.ts:22`, `server.ts:11`). **There is nowhere for "read once at boot, logged loudly" to live.** ~30 lines, and it's a prerequisite for the whole §3.4 design.

Add a sixth guard while you're there: **fail closed.** Unset `PAYMENT_MODE` aborts startup. `live` with missing or `test`-prefixed Razorpay keys aborts.

### 2.8 Other Milestone 0 items, corrected

- **Middleware matcher**: `["/admin","/admin/:path*","/dashboard","/bookings/:path*","/vendor","/vendor/:path*"]`. A bare `/vendor` misses `/vendor/leads/[id]`; a careless `/vendor:path*` captures `/vendors` and forces login on public discovery.
- **Migration 011 cannot be edited in place** — it ends in `ON CONFLICT DO NOTHING` and has already run. Write migration 018 with explicit `UPDATE`/`DELETE`.
- **`EVENT_TYPES` additions need a migration** — `events.type` has a CHECK (`003:14`); `bookings.event_type` has none and the zod schema is a free string.
- **Availability semantics must be stated**: rows exist only when explicitly set, so **absence means available**. Otherwise every real vendor disappears from search.
- ⚠️ **`bookingListFields` doesn't select `created_at`** (`bookings.ts:32-48`), which §6.4 and §6.7 both silently depend on for "2 hours ago".
- ⚠️ **Both dashboards share `queryKey: ["bookings"]`** with different `queryFn`s (`dashboard/page.tsx:293`, `vendor/page.tsx:570`). Use `["bookings", role]`.

---

## P3 — Corrections to `mvp-photography.md`

Beyond the delete range (fixed) and §2.5 (see 1.1), the plan review found:

| § | Wrong | Right |
|---|---|---|
| §3.3 | `vendor_countered → customer_confirmed` | `accept-counter` sets **`vendor_accepted`** (`bookings.ts:777`). `customer_confirmed` is written by no code path. |
| §3.3 | `vendor_reviewing` is "optional, no gate" | accept/decline/counter all guard `status !== "inquiry"` (`:388`, `:519`, `:645`). Setting it on page-open makes the lead **permanently un-actionable**. |
| §2.3 | Discoverability "enforced identically" in `computeVendorReadiness` | `vendorDiscoverableWhere()` short-circuits on `approved` (`vendor-discoverability.ts:14`). An approved vendor with 0 portfolio photos is live in search while the readiness nudge says incomplete. |
| §6.11 | "both tables already exist" | `platform_config` does. **`category_configs` doesn't** — §10 creates it. |
| §6.11 | "Superadmin only, enforced by `requireAdmin`" | `require-admin.ts:25` accepts `admin` **or** `superadmin`. Needs a `requireSuperadmin`. |
| §10 M1 | demo = booking from enquiry to release on the deployed site | The enquiry form is M3 and the Accept button is M2. **M1 cannot pass its own gate** — restate as API-driven, or pull minimal Accept/Pay forward. |
| §3.3 | "photography uses 11 of 13 states" | the diagram below names all 13 |

Plus eleven wrong line-number citations, all off by 2–4 lines. Not worth chasing individually; treat every `file:line` in my docs as approximate and grep for the symbol.

---

## P4 — UX, ordered by whether it changes outcomes

1. **Delete fabricated content** — P0.1 above.
2. **`/vendor/leads/[id]`** — reorder money-first (date + area + "₹44,100 to you" + calendar verdict, then actions, then brief). As I specified it, the three buttons are fourth on a 360×640 phone, below the fold. **And I never specified the logged-out state** — which is the realistic first render, since he arrives from a WhatsApp link without an account. That login wall is inside the 60 seconds and is the likeliest abandonment point on the vendor side.
3. **Fix the Tailwind mismatch** — P2.2.
4. **One exhaustive `lib/booking-status.ts`** — status→copy is currently forked across `vendor/page.tsx:33` and `bookings/[id]/page.tsx:37` with different strings, and `EVENT_TYPE_LABELS` is copied into four files. Make it `Record<BookingStatus, Record<"customer"|"vendor", StatusCopy>>` so a 14th status is a type error.
5. **`/vendor` dashboard** — `vendor/page.tsx:377,386` set `min-w-[720px]` inside `overflow-x-auto`. At 360px the vendor scrolls sideways to reach Accept, in column seven of seven. On the page they open most.
6. **`/bookings/[id]`** — one route, one shell, two action-panel files. Today `hasActionButtons` covers four statuses and everything else falls to **"No actions available at this stage"** — including a vendor viewing a funded booking, the moment the product exists to deliver. Rule: every one of the 13 statuses returns a sentence for both roles; no branch falls through.
7. **Three-step enquiry form** — delete the "Inquiry amount (₹)" field where the customer types their own price (`MenuAndQuoteForm.tsx:353-375`); save to sessionStorage *before* the login redirect at `:145`, which currently discards everything typed; all inputs `text-base` at mobile widths, because below 16px **iOS Safari zooms the viewport on every field**.
8. **Loading / empty / error components + toast** — §8 mandates all three on every screen; §6 specifies none. Replaces `alert()` at `dashboard/page.tsx:334,345`.
9. **Semantic tokens + 44px tap targets + contrast.** `mk-*` has no success/warning/danger value, so every screen escapes into raw hex. `mk-muted` `#7A7060` on `mk-bg` `#F5EFE2` is ~3.9:1 — under AA, and used for body text throughout. In sunlight that's the difference between readable and not. **Judgement call worth keeping: held money should be navy, not green.** Green reads "done"; held money is safe and *waiting*.
10. **URL-persisted filters on `/vendors`** + the lead-capture empty state.

**Explicitly not worth a day:** dark mode (set `enableSystem={false}` — no `mk-*` token has a dark value), `tabs`/`table`/`separator`/`avatar` primitives, drag-select on the calendar, animation polish, desktop layouts of vendor screens, admin screen visual quality.

---

## P5 — ❓ Questions no amount of code answers

**The one that could invalidate the architecture:** does money from a captured payment stay with Razorpay indefinitely, or does it settle to Kritva's bank account on a normal cycle? If it auto-settles, **Kritva is holding customer funds** — the exact thing the model says it can't do — and an indefinite dispute hold becomes indefinite custody of someone else's money. Ask Razorpay in writing. Answerable this week, and everything downstream depends on it.

Also for Razorpay, and not to be answered from memory: how Route transfers interact with gateway fees and which balance they draw from; whether transfers support an idempotency key; whether a transfer can be reversed after a chargeback; order expiry semantics.

**Needs professional confirmation, not a guess:** GST treatment on the commission (`payments.gst_on_fee` exists and is never written — is 2% inclusive or exclusive of tax? Those are different numbers on the screen §4.4 calls non-negotiable), TDS on marketplace payouts, and payment-record retention obligations.

**Still open from before:** cancellation refund scale, auto-release window, which ID documents are mandatory.

---

## What this list does not cover

**There are no tests anywhere** in `packages/api` or `packages/payments` — `tests/` contains three `.http` files. Every concurrency claim in P1.4 is derived from reading SQL under `READ COMMITTED` semantics, not from an executed test. Before that item is called done, it needs a concurrent-request test that proves the guards hold under the PgBouncer transaction-mode pooling in `packages/db/src/client.ts:30-33`.

⚠️ Ten declared tables have never had a query run against them: `payment_payouts`, `vendor_bank_accounts`, `webhook_events`, `invoices`, `vendor_availability`, `disputes`, `conversations`, `messages`, `reviews`, `notification_preferences`. Four of those are load-bearing for the plan — their shape is untested.
