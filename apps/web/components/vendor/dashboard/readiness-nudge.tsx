import Link from "next/link";
import { Check, Circle } from "lucide-react";
import type { VendorReadinessResponse } from "@kritva/types";

const CHECKLIST_LABELS: Record<
  keyof VendorReadinessResponse["checks"],
  string
> = {
  category: "Pick at least one category",
  packages: "Add an active package",
  portfolio: "Upload 5 portfolio photos",
  profile_photo: "Add a profile photo",
};

export function ReadinessNudge({
  readiness,
}: {
  readiness: VendorReadinessResponse;
}) {
  if (readiness.complete) return null;

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="font-sans text-meta font-semibold text-amber-950">
        Finish your profile to get found
      </p>
      <ul className="mt-2.5 space-y-2">
        {(
          Object.keys(CHECKLIST_LABELS) as Array<
            keyof VendorReadinessResponse["checks"]
          >
        ).map((key) => {
          const done = readiness.checks[key] === true;
          return (
            <li
              key={key}
              className="flex items-start gap-2 font-sans text-meta text-amber-950"
            >
              {done ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700/60" />
              )}
              <span className={done ? "text-amber-900/70" : undefined}>
                {CHECKLIST_LABELS[key]}
              </span>
            </li>
          );
        })}
      </ul>
      <Link
        href="/vendor/profile"
        className="mt-3 inline-flex min-h-11 items-center font-sans text-meta font-medium text-mk-navy underline-offset-2 hover:underline"
      >
        Open profile editor
      </Link>
    </section>
  );
}
