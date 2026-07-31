# @kritva/payments

PaymentProvider abstraction for Kritva. Routes, booking transitions, commission maths, and notifications are identical in both modes — only the gateway adapter changes.

## Modes

| `PAYMENT_MODE` | Provider | Gateway |
|---|---|---|
| `simulated` (default for build/demo) | `SimulatedProvider` | Kritva-hosted checkout + delayed webhook |
| `live` | `RazorpayProvider` | Razorpay Checkout + Route transfers |

Selection happens once at API boot via `createPaymentProvider()` in `@kritva/api` config. Cross-mode operations are refused: a `payments.mode` row must match the server `PAYMENT_MODE`.

## Flipping to live

Do **not** flip until Razorpay Route is approved. When ready:

1. Set `PAYMENT_MODE=live`
2. Set live keys: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (must **not** be `rzp_test_`)
3. Set `RAZORPAY_WEBHOOK_SECRET` and point Razorpay webhooks at `POST /v1/payments/webhook`
4. Ensure vendors have Route linked accounts (`acc_*` stored in `vendor_bank_accounts.razorpay_fund_id`)
5. Optionally set `NEXT_PUBLIC_RAZORPAY_KEY_ID` for Checkout

External blockers (not code): Route approval, settlement model, GST/TDS on commission.

## Amounts

All amounts are **paisa integers**. Format `₹` only at render.
