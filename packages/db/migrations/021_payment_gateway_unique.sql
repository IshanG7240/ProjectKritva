-- Migration 021: UNIQUE on payments gateway IDs (bind Razorpay order to booking)
-- Partial unique indexes allow multiple NULLs (pre-gateway / legacy rows).

BEGIN;

DROP INDEX IF EXISTS idx_pay_gateway_order;

CREATE UNIQUE INDEX uq_pay_gateway_order_id
  ON payments (gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;

CREATE UNIQUE INDEX uq_pay_gateway_payment_id
  ON payments (gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL;

COMMENT ON INDEX uq_pay_gateway_order_id IS
  'One payments row per Razorpay order. Bound at create-order (status=initiated).';
COMMENT ON INDEX uq_pay_gateway_payment_id IS
  'One payments row per Razorpay payment. Set at verify/capture.';

COMMIT;
