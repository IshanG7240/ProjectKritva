"use client";

import { InlineEditField } from "@/components/vendor/edit/InlineEditField";

interface AboutSectionProps {
  businessName?: string;
  description?: string | null;
  editable?: boolean;
  onDescriptionChange?: (value: string) => void;
}

export function AboutSection({
  description,
  editable = false,
  onDescriptionChange,
}: AboutSectionProps) {
  if (editable && onDescriptionChange) {
    return (
      <section className="space-y-2">
        <h2 className="text-heading text-mk-ink">About</h2>
        <InlineEditField
          value={description ?? ""}
          onChange={onDescriptionChange}
          multiline
          rows={6}
          placeholder="Tell customers about your work and style."
          className="text-body text-mk-ink"
          inputClassName="text-body leading-snug"
        />
      </section>
    );
  }

  const text = description?.trim();
  if (!text) return null;

  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  return (
    <section className="space-y-2">
      <h2 className="text-heading text-mk-ink">About</h2>
      <div className="space-y-2.5">
        {paragraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 48)}
            className="whitespace-pre-line text-body text-mk-ink"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
