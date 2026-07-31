"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { shellTask } from "@/lib/shell";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={`${shellTask} space-y-4 px-4 py-16 text-center sm:px-6`}>
      <h1 className="font-serif text-title text-mk-ink">Admin console hiccup.</h1>
      <p className="font-sans text-meta text-mk-muted">
        We couldn&apos;t load this admin view. Try again in a moment.
      </p>
      <div className="flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
