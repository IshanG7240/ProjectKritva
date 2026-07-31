/**
 * Escrow release → vendor transfer. Delegates to the active PaymentProvider.
 * Live: Razorpay Route `payments.transfer` (paisa). Simulated: in-memory ledger.
 */

import { getPaymentProvider } from "./provider.js";
import type { TransferInput, TransferResult } from "./types.js";

export type { TransferInput, TransferResult };

export async function transfer(input: TransferInput): Promise<TransferResult> {
  return getPaymentProvider().transfer(input);
}

export async function getTransfer(
  transferId: string,
): Promise<TransferResult | null> {
  const provider = getPaymentProvider();
  if (!provider.getTransfer) return null;
  return provider.getTransfer(transferId);
}
