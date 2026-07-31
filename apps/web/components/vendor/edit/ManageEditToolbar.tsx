"use client";

import Link from "next/link";
import { ExternalLink, Eye, Loader2, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ManageEditToolbarProps {
  vendorSlug: string;
  isDirty: boolean;
  saving: boolean;
  canPreview: boolean;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
  onSave: () => void;
  onDiscard?: () => void;
}

export function ManageEditToolbar({
  vendorSlug,
  isDirty,
  saving,
  canPreview,
  isPreviewMode,
  onTogglePreview,
  onSave,
  onDiscard,
}: ManageEditToolbarProps) {
  return (
    <div className="sticky top-14 z-20 mt-14 border-b border-mk-border bg-mk-surface-2/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="font-sans text-meta font-medium text-mk-ink">
            {isPreviewMode ? "Live preview" : "Editing profile"}
          </span>
          {isPreviewMode && isDirty && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-label font-medium text-sky-900">
              Showing unsaved draft
            </span>
          )}
          {!isPreviewMode && isDirty ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-label font-medium text-amber-900">
              Unsaved changes
            </span>
          ) : !isPreviewMode ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-label font-medium text-emerald-800">
              All changes saved
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={isPreviewMode ? "default" : "outline"}
            size="sm"
            onClick={onTogglePreview}
            className={cn(
              "gap-1.5",
              !isPreviewMode && "border-mk-border bg-white",
            )}
          >
            {isPreviewMode ? (
              <>
                <Pencil className="h-3.5 w-3.5" />
                Back to editing
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Live preview
              </>
            )}
          </Button>

          {canPreview && (
            <Link
              href={`/vendors/${vendorSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1.5 border-mk-border bg-white",
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View public profile
            </Link>
          )}

          {!isPreviewMode && isDirty && onDiscard && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={onDiscard}
            >
              Discard
            </Button>
          )}

          {!isPreviewMode && (
            <Button
              type="button"
              size="sm"
              disabled={!isDirty || saving}
              onClick={onSave}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
