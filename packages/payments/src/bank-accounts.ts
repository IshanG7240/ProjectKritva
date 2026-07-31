/**
 * Vendor linked-account helpers — delegate to the active PaymentProvider.
 * DB persistence (vendor_bank_accounts) lives in the API routes.
 */

import { getPaymentProvider } from "./provider.js";
import {
  decryptAccountNumber,
  encryptAccountNumber,
  lastFourDigits,
} from "./crypto.js";
import type { VendorPayoutDetails } from "./types.js";

export {
  decryptAccountNumber,
  encryptAccountNumber,
  lastFourDigits,
} from "./crypto.js";

export async function createLinkedAccount(
  vendor: VendorPayoutDetails,
): Promise<{ account_id: string }> {
  return getPaymentProvider().createLinkedAccount(vendor);
}

/** Encrypt + derive display fields for a vendor_bank_accounts insert. */
export function prepareBankAccountForStorage(accountNumber: string): {
  accountNumberEnc: Buffer;
  lastFour: string;
} {
  return {
    accountNumberEnc: encryptAccountNumber(accountNumber),
    lastFour: lastFourDigits(accountNumber),
  };
}
