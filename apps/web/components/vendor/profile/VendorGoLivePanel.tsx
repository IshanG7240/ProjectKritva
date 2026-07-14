"use client";

import { Check, Circle, Loader2 } from "lucide-react";
import type { VendorReadinessResponse } from "@kritva/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_COPY: Record<
  string,
  { title: string; description: string; tone: "amber" | "sky" | "rose" | "emerald" }
> = {
  draft: {
    title: "Profile in draft",
    description:
      "Complete the checklist below, save your changes, then submit for admin review.",
    tone: "amber",
  },
  pending_review: {
    title: "Submitted for review",
    description:
      "Our team is reviewing your profile. You can still edit details while you wait.",
    tone: "sky",
  },
  rejected: {
    title: "Changes requested",
    description:
      "Update your profile based on the feedback below, save, then re-submit.",
    tone: "rose",
  },
  approved: {
    title: "Profile live",
    description: "Your business is visible on the marketplace.",
    tone: "emerald",
  },
};

const TONE_STYLES = {
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  sky: "border-sky-200 bg-sky-50 text-sky-950",
  rose: "border-rose-200 bg-rose-50 text-rose-950",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

const CHECKLIST_LABELS: Record<keyof VendorReadinessResponse["checks"], string> =
  {
    category: "At least one category selected",
    packages: "At least one active package",
    portfolio: "At least five portfolio photos",
  };

interface VendorGoLivePanelProps {
  verificationStatus: string;
  verificationNotes?: string | null;
  readiness: VendorReadinessResponse | undefined;
  readinessLoading: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
}

export function VendorGoLivePanel({
  verificationStatus,
  verificationNotes,
  readiness,
  readinessLoading,
  isDirty,
  isSubmitting,
  submitError,
  onSubmit,
}: VendorGoLivePanelProps) {
  if (verificationStatus === "approved") {
    return null;
  }

  const status =
    STATUS_COPY[verificationStatus] ?? STATUS_COPY.draft!;
  const canSubmit =
    (verificationStatus === "draft" || verificationStatus === "rejected") &&
    readiness?.complete === true &&
    !isDirty &&
    !isSubmitting;

  const submitLabel =
    verificationStatus === "rejected"
      ? "Re-submit for review"
      : "Submit for review";

  return (
    <div className="border-b border-mk-border bg-white px-6 py-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <div
          className={cn(
            "rounded-xl border px-4 py-3",
            TONE_STYLES[status.tone],
          )}
        >
          <p className="font-sans text-sm font-semibold">{status.title}</p>
          <p className="mt-1 font-sans text-sm leading-relaxed opacity-90">
            {status.description}
          </p>
          {verificationStatus === "rejected" && verificationNotes ? (
            <p className="mt-3 rounded-lg border border-rose-200/80 bg-white/70 px-3 py-2 font-sans text-sm leading-relaxed text-rose-900">
              <span className="font-medium">Admin feedback: </span>
              {verificationNotes}
            </p>
          ) : null}
        </div>

        {(verificationStatus === "draft" || verificationStatus === "rejected") && (
          <div className="rounded-xl border border-mk-border bg-[#FDFBF7] p-4">
            <p className="font-sans text-sm font-semibold text-mk-ink">
              Go-live checklist
            </p>

            <ul className="mt-3 space-y-2">
              {(
                Object.keys(CHECKLIST_LABELS) as Array<
                  keyof VendorReadinessResponse["checks"]
                >
              ).map((key) => {
                const done = readiness?.checks[key] === true;
                return (
                  <li
                    key={key}
                    className="flex items-start gap-2 font-sans text-sm text-mk-ink"
                  >
                    {readinessLoading ? (
                      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-mk-muted" />
                    ) : done ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-mk-muted" />
                    )}
                    <span className={done ? "text-mk-ink" : "text-mk-muted"}>
                      {CHECKLIST_LABELS[key]}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                disabled={!canSubmit}
                onClick={onSubmit}
                className="bg-mk-navy hover:bg-[#162C47]"
              >
                {isSubmitting && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                {submitLabel}
              </Button>
              {isDirty ? (
                <p className="font-sans text-xs text-amber-800">
                  Save your changes before submitting.
                </p>
              ) : null}
            </div>

            {submitError ? (
              <p className="mt-3 font-sans text-sm text-red-600">{submitError}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
