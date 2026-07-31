/**
 * Platform fee math — integer basis points only. Never floats.
 *
 * platform_fee = floor(amount_paisa * commission_bps / 10_000)
 * vendor_payout = amount_paisa - platform_fee  (exact by subtraction)
 */

import { eq, inArray } from "drizzle-orm";
import { categoryConfigs, platformConfig, vendors } from "@kritva/db";
import { db } from "@kritva/db/client";

/** Fallback when no category/platform config row exists (200 = 2%). */
export const DEFAULT_COMMISSION_BPS = 200;
const GST_BPS_ON_FEE = 1800; // 18%

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function computePlatformAmounts(
  amountPaisa: number,
  commissionBps: number,
): { platformFee: number; gstOnFee: number } {
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

/** Resolve live commission for snapshotting at accept. */
export async function resolveCommissionBps(
  dbOrTx: typeof db | DbTransaction,
  vendorId: string,
): Promise<number> {
  const [vendor] = await dbOrTx
    .select({ category: vendors.category })
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .limit(1);

  const categories = vendor?.category ?? [];
  if (categories.length > 0) {
    const [cat] = await dbOrTx
      .select({ commissionBps: categoryConfigs.commissionBps })
      .from(categoryConfigs)
      .where(inArray(categoryConfigs.id, categories))
      .limit(1);

    if (cat != null) return cat.commissionBps;
  }

  const [cfg] = await dbOrTx
    .select({ value: platformConfig.value })
    .from(platformConfig)
    .where(eq(platformConfig.key, "default_commission_bps"))
    .limit(1);

  const raw = cfg?.value;
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0) {
    return raw;
  }

  return DEFAULT_COMMISSION_BPS;
}
