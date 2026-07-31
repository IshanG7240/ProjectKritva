export {
  getRazorpayClient,
  getRazorpayKeyId,
} from "./razorpay-client.js";

export {
  createOrder,
  verifyPaymentSignature,
  fetchPayment,
  fetchOrder,
  MIN_ORDER_AMOUNT_PAISE,
  OrderValidationError,
  RazorpayApiError,
  RazorpayAuthError,
  type CreateOrderInput,
  type CreateOrderResult,
  type FetchedPayment,
  type FetchedOrder,
} from "./orders.js";

export {
  CAPTURE_WEBHOOK_EVENTS,
  verifyWebhookSignature,
  parseWebhookEvent,
  isCaptureWebhookEvent,
  extractCapturedPayment,
  type CaptureWebhookEventType,
  type RazorpayWebhookEvent,
  type RazorpayWebhookPaymentEntity,
  type CapturedPaymentFromWebhook,
} from "./webhooks.js";

export {
  createPaymentProvider,
  getPaymentProvider,
  getSimulatedProvider,
  resetPaymentProviderForTests,
  type CreatePaymentProviderOptions,
} from "./provider.js";

export {
  RazorpayProvider,
  fetchGatewayBalancePaisa,
} from "./razorpay-provider.js";
export { SimulatedProvider } from "./simulated-provider.js";

export {
  DEFAULT_COMMISSION_BPS,
  GST_BPS_ON_FEE,
  computePlatformAmounts,
  vendorPayoutPaisa,
} from "./commission.js";

export {
  createLinkedAccount,
  prepareBankAccountForStorage,
  encryptAccountNumber,
  decryptAccountNumber,
  lastFourDigits,
} from "./bank-accounts.js";

export { transfer, getTransfer } from "./transfers.js";
export { refund } from "./refunds.js";

export type {
  PaymentMode,
  PaymentProvider,
  VendorPayoutDetails,
  TransferInput,
  TransferResult,
  RefundInput,
  RefundResult,
  WebhookEvent,
  SimulatedCheckoutInput,
  SimulatedCheckoutResult,
} from "./types.js";
