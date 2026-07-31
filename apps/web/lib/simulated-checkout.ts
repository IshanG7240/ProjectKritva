import { apiClient } from "@/lib/api-client";

export interface SimulatedCheckoutResult {
  order_id: string;
  payment_id: string | null;
  signature: string | null;
  status: "captured_pending_webhook" | "failed" | "injected";
  webhook_scheduled: boolean;
}

export type SimulatedCheckoutOutcome = "success" | "failure";
export type SimulatedCheckoutInject = "bad_signature" | "replay";

export function isSimulatedOrderId(orderId: string): boolean {
  return orderId.startsWith("simulated_");
}

export function buildSimulatedCheckoutPath(
  bookingId: string,
  order: { order_id: string; amount: number },
): string {
  const params = new URLSearchParams({
    order_id: order.order_id,
    amount: String(order.amount),
  });
  return `/bookings/${bookingId}/pay?${params.toString()}`;
}

export async function runSimulatedCheckout(input: {
  order_id: string;
  outcome: SimulatedCheckoutOutcome;
  inject?: SimulatedCheckoutInject | null;
}): Promise<SimulatedCheckoutResult> {
  const res = await apiClient.post<SimulatedCheckoutResult>(
    "/v1/payments/simulated/checkout",
    {
      order_id: input.order_id,
      outcome: input.outcome,
      ...(input.inject != null ? { inject: input.inject } : {}),
    },
  );

  if (res.error) {
    throw new Error(res.error.message);
  }

  if (!res.data) {
    throw new Error("Simulated checkout returned no data");
  }

  return res.data;
}

/** Browser convenience path — same payload shape as live Razorpay verify. */
export async function verifySimulatedPayment(input: {
  booking_id: string;
  order_id: string;
  payment_id: string;
  signature: string;
}): Promise<void> {
  const res = await apiClient.post("/v1/payments/verify-payment", {
    booking_id: input.booking_id,
    razorpay_payment_id: input.payment_id,
    razorpay_order_id: input.order_id,
    razorpay_signature: input.signature,
  });

  if (res.error) {
    throw new Error(res.error.message);
  }
}
