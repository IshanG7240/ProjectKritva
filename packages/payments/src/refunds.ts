/**
 * Full / partial refunds. Delegates to the active PaymentProvider.
 */

import { getPaymentProvider } from "./provider.js";
import type { RefundInput, RefundResult } from "./types.js";

export type { RefundInput, RefundResult };

export async function refund(input: RefundInput): Promise<RefundResult> {
  return getPaymentProvider().refund(input);
}
