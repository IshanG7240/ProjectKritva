"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { formatInr } from "@/lib/booking-form";
import {
  runSimulatedCheckout,
  verifySimulatedPayment,
  type SimulatedCheckoutInject,
} from "@/lib/simulated-checkout";
import { toast } from "@/components/ui/toast";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Page, PageHeader } from "@/components/layout/page";

type PendingAction = "success" | "failure" | "replay" | "bad_signature" | null;

export default function SimulatedPayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: bookingId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useRequireAuth("customer");

  const orderId = searchParams.get("order_id") ?? "";
  const amountRaw = searchParams.get("amount");
  const amountPaisa = amountRaw != null ? Number(amountRaw) : NaN;
  const amountValid =
    Number.isInteger(amountPaisa) && amountPaisa > 0 && orderId.length > 0;

  const [pending, setPending] = useState<PendingAction>(null);

  async function handleOutcome(
    outcome: "success" | "failure",
    inject?: SimulatedCheckoutInject | null,
    action: Exclude<PendingAction, null> = outcome,
  ) {
    if (!amountValid || pending) return;

    setPending(action);
    try {
      const result = await runSimulatedCheckout({
        order_id: orderId,
        outcome,
        inject: inject ?? null,
      });

      if (outcome === "failure" || result.status === "failed") {
        toast.add({
          title: "Payment failed",
          description: "Simulated failure — no money moved.",
          type: "error",
        });
        return;
      }

      if (!result.payment_id || !result.signature) {
        throw new Error("Simulated checkout did not return payment credentials");
      }

      await verifySimulatedPayment({
        booking_id: bookingId,
        order_id: result.order_id,
        payment_id: result.payment_id,
        signature: result.signature,
      });

      toast.add({
        title: "Payment held",
        description: "Funds are held safely until the job is done.",
        type: "success",
      });
      router.replace(`/bookings/${bookingId}`);
    } catch (error: unknown) {
      toast.add({
        title: "Something went wrong",
        description:
          error instanceof Error ? error.message : "Could not complete payment",
        type: "error",
      });
    } finally {
      setPending(null);
    }
  }

  if (loading || !user) return null;

  if (!amountValid) {
    return (
      <Page width="task">
        <PageHeader
          title="Pay into escrow"
          back={{ href: `/bookings/${bookingId}`, label: "Back to booking" }}
        />
        <Card>
          <CardContent className="space-y-4">
            <p className="text-body text-mk-ink">
              This checkout link is missing order details. Go back and tap Pay
              again.
            </p>
            <Link
              href={`/bookings/${bookingId}`}
              className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}
            >
              Back to booking
            </Link>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page width="task">
      <PageHeader
        title="Pay into escrow"
        back={{ href: `/bookings/${bookingId}`, label: "Back to booking" }}
      />

      {/* Practice-mode banner — must NOT imitate Razorpay branding. */}
      <div
        className="mb-6 flex items-start gap-3 rounded-md border border-mk-border bg-mk-surface-2 px-4 py-3"
        role="status"
      >
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-mk-navy" aria-hidden />
        <div>
          <p className="text-subhead text-mk-ink">
            Practice mode — no real money moves.
          </p>
          <p className="text-meta text-mk-muted">
            Same screens as live so you can see how it works.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <div>
            <p className="text-meta text-mk-muted">Amount to hold</p>
            <p className="mt-1 text-money-lg tabular-nums text-mk-navy">
              {formatInr(amountPaisa)}
            </p>
            <p className="mt-1.5 text-meta text-mk-muted">
              Held safely. Released when the job&apos;s done.
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            variant="primary"
            className="w-full"
            disabled={pending != null}
            onClick={() => void handleOutcome("success")}
          >
            {pending === "success" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {`Pay ${formatInr(amountPaisa)}`}
          </Button>

          <details className="group">
            <summary className="cursor-pointer text-meta text-mk-muted hover:text-mk-ink">
              Test other outcomes
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                type="button"
                size="md"
                variant="secondary"
                className="w-full"
                disabled={pending != null}
                onClick={() => void handleOutcome("failure")}
              >
                {pending === "failure" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Simulate payment failure
              </Button>
              <Button
                type="button"
                size="md"
                variant="ghost"
                className="w-full text-mk-muted"
                disabled={pending != null}
                onClick={() =>
                  void handleOutcome("success", "replay", "replay")
                }
              >
                {pending === "replay" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Pay + replay webhook
              </Button>
              <Button
                type="button"
                size="md"
                variant="ghost"
                className="w-full text-mk-muted"
                disabled={pending != null}
                onClick={() =>
                  void handleOutcome(
                    "success",
                    "bad_signature",
                    "bad_signature",
                  )
                }
              >
                {pending === "bad_signature" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Pay with bad signature
              </Button>
            </div>
          </details>

          <Link
            href={`/bookings/${bookingId}`}
            className="block text-center text-meta text-mk-muted hover:text-mk-ink"
          >
            Cancel and return
          </Link>
        </CardContent>
      </Card>
    </Page>
  );
}
