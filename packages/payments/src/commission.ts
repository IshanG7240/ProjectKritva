/**
 * Commission calculator — integer basis points only. Never floats.
 *
 * platform_fee = floor(amount_paisa * commission_bps / 10_000)
 * vendor_payout = amount_paisa - platform_fee  (exact by subtraction)
 */

/** Fallback when no category/platform config exists (200 = 2%). */
export const DEFAULT_COMMISSION_BPS = 200;

/** GST on platform fee: 18% in basis points. */
export const GST_BPS_ON_FEE = 1800;

export function computePlatformAmounts(
  amountPaisa: number,
  commissionBps: number,
): { platformFee: number; gstOnFee: number } {
  if (!Number.isInteger(amountPaisa) || amountPaisa < 0) {
    throw new Error("amountPaisa must be a non-negative integer");
  }
  if (!Number.isInteger(commissionBps) || commissionBps < 0) {
    throw new Error("commissionBps must be a non-negative integer");
  }

  const platformFee = Math.floor((amountPaisa * commissionBps) / 10_000);
  const gstOnFee = Math.floor((platformFee * GST_BPS_ON_FEE) / 10_000);
  return { platformFee, gstOnFee };
}

export function vendorPayoutPaisa(
  amountPaisa: number,
  platformFee: number,
): number {
  return amountPaisa - platformFee;
}
