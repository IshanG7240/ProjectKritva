# docs_v3 Execution Board

Living tracker for the Master Agent Orchestration Plan. Authority: `remediation.md` > `mvp-photography.md`.

**North star:** A photographer's bank account receives real money through Kritva.

## UI rework (plan: `claude-doctor-splendid-torvalds.md`) — branch `ui/wave-1-foundation`

| Wave | Status | Agents | Notes |
|------|--------|--------|-------|
| UI-W1 Foundation | done | [prim](5d56f8a9-3de3-46c8-ba2c-55bde993083e) [layouts](8927e48b-1d94-4d0b-af17-918e606a83e9) | tokens+hsl; Button/Card/Media/Page; (shop) layouts; login CTA |
| UI-W2 Customer | done | [home](f6704dc4-6001-43cb-bfe2-93181ef41e49) [vendors](5da6c48f-7f2d-4614-9e95-3dfdf940882d) [book](b9e3b34f-3f18-4afd-879c-859a3c4069f3) [profile](e64b937d-d02a-4c88-8805-69ee2731b4ba) | home, directory, profile sticky bar, photos gallery, dashboard/booking spine, pay/auth |
| UI-W3 Vendor | done | [vendor](01afa195-11d7-4b7c-9940-bd82f3da30db) | money-first dashboard, 60s lead, calendar/payouts/profile; logged-out lead date+amount needs API |
| UI-W4 Admin | done | [admin](0cc39901-57f2-4f25-89ba-a21d45007fe9) | Page/Table normalize across 6 pages |
| UI-W5 Enforce | done | [w5](1d8d214e-1880-4e84-99da-bfd302389e7e) [hex](c060e927-e41f-4ecb-b191-65ef640c1158) [flip](b7e2d0c3-e703-4206-9029-63169b437261) | greps alert/1440/inline-flex/dark/hex = 0; fontSize+borderRadius wholesale flip landed; text-*/rounded-* stragglers migrated to scale tokens; `tsc --noEmit` green |

Loop: stopped — Waves UI-W1…W5 exit criteria met on `ui/wave-1-foundation` (no commits yet).

| Wave | Status | Agents | Demo gate |
|------|--------|--------|-----------|
| Bootstrap | done | master | docs tracked; Supabase restore blocked (free limit) — REVOKE migration assumed |
| Wave 0 — P0 | done | [0A](b63b8b40-0ce5-46a0-8941-ab507d36ebdb) [0B](89a4404f-c5f7-4bbb-821e-7be1128b0d57) [0C](7247e7bb-05b8-408d-8fc9-ced0133b78f0) | fabricated UI gone; mocks deleted; 018 REVOKE |
| Wave 1 — M0 | done | [T1](f440c79f-9673-4008-99ff-d86186bbc911) [T2](06981e3a-9892-441b-ada5-78cd7b097dc9) [T3](ef210751-acc9-4178-bc13-dad306a5b020) | zod pin; 019/020; UI kit; date filter |
| Wave 2 — P1 money | done | [2.1](ff6c6923-ddb6-42cb-807e-fb2b927f3673) [2.3](b08e68b1-e097-427f-8bc9-ba169ad004da) [2.4](cbf51c20-a2a1-4df5-b392-e751964f579c) [2.5](10d3b344-e9ea-4bdd-9fdc-327617829df9) | guards; order bind; webhook; bps fee; bans; refunded |
| Wave 3 — M1 | done (soft gate) | backend + UI + [sec](8003f350-926b-451a-ac12-19f17da980e5) [bugbot](16583e5f-b92a-44f2-a6a8-f798b2e5fef6) [fix](92dc18ca-6afe-4d48-84fd-e302b92a1da3) | Provider+admin/payouts/sim checkout; E2E needs awake Supabase |
| Wave 4 — M2 | done | [4A](f2589456-f8b3-4ad5-bb5a-7925195e56f9) [4B](3416dfe2-d482-4c69-8336-37c38527a6b3) [4C](593220a0-5f65-4ea8-b286-0aef4e6a258f) | `/vendor/leads/[id]`, calendar, mobile dashboard |
| Wave 5 — M3 | done | [5A](c644ce0b-5397-4326-922d-013c22ff7f60) [5B](e4584f51-65f5-45ea-961c-d9b04f7f470f) [5C](3f4ef3ee-c995-412d-a71e-85b390f2a5ff) | discovery + 3-step enquiry + dashboard/booking spine |
| Wave 6 — M4 | done | [M4](e9b278fd-23c9-42a5-909b-750023864497) | deliver/dispute/resolve/jobs/reconcile; auto-release 7d |
| Wave 7 — M5 | code done / demo blocked | [M5](58f63af6-9290-473c-92c5-be853906a0f4) | RazorpayProvider live path ready; **Route approval** gates real ₹100 |

## Quality gates (hard)

After each wave before advancing:
1. **bugbot** — completeness vs acceptance criteria, bugs, scope creep
2. **security-review** — when money paths changed
3. **UI/UX + live screenshots** — at 360px + desktop (`docs_v3/screenshots/`)

### Latest screenshot pass (`docs_v3/screenshots/final/`)

| Shot | Result |
|------|--------|
| `vendors-mobile.png` | OK — date filter, Photography/Delhi defaults, skeleton while API/DB unavailable |
| `vendors-desktop.png` | OK — same filters |
| `home-desktop.png` | Honest feature strip; hero content below fold / low contrast CTA (follow-up) |
| `login-mobile.png` | OK — Google sign-in |
| `vendor-authwall.png` | OK — middleware → login with returnTo |

### UX notes from review
- Vendor directory stuck on skeletons until Supabase is restored and migrations 018–022 applied
- Home hero may need scroll/priority image check — first viewport can look empty on desktop
- Auth walls for `/vendor`, `/dashboard`, `/admin/*` work

## External blockers

- [ ] Supabase project `Kritva` (`cnrvsqbrfztwazpisbxk`) — **INACTIVE**; restore blocked by free-project limit (pause/delete another project or upgrade)
- [x] Apply MVP migrations on restored DB (`is_demo`, `category_configs`, `commission_bps`, `refunded`/`escrow_outcome`; 018 REVOKE + 021 gateway UNIQUE still pending approval)
- [ ] Razorpay Route approval (M5 demo)
- [ ] Razorpay settlement model answer (P5)
- [ ] GST/TDS on commission (P5)

## Live flip checklist (when Route approved)

1. `PAYMENT_MODE=live` + live keys (not `rzp_test_`) + `RAZORPAY_WEBHOOK_SECRET`
2. Vendors have Route linked accounts (`acc_*`)
3. Webhook URL → `POST /v1/payments/webhook`
4. One ₹100 booking end to end; confirm reconciliation vs Razorpay balance

## Notes

- Grep symbols; do not trust line numbers in docs.
- Serialize: `payments.ts`, `bookings.ts`, `packages/types`.
- Max 3 implementers + 1 explorer. Money cluster: 1 agent on `payments.ts`.
- Use websearch for latest docs/setup when needed.
- Local `.env` has `PAYMENT_MODE=simulated` (required for API boot).
