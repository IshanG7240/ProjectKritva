"use client";

import { InlineEditField } from "@/components/vendor/edit/InlineEditField";

interface AboutSectionProps {
  businessName?: string;
  description?: string | null;
  editable?: boolean;
  onDescriptionChange?: (value: string) => void;
}

export function AboutSection({
  businessName,
  description,
  editable = false,
  onDescriptionChange,
}: AboutSectionProps) {
  if (editable && onDescriptionChange) {
    return (
      <section>
        <h2 className="font-sans text-lg font-semibold text-mk-ink">
          About {businessName}
        </h2>
        <div className="mt-4">
          <InlineEditField
            value={description ?? ""}
            onChange={onDescriptionChange}
            multiline
            rows={8}
            placeholder="Tell customers about your business, experience, and style."
            className="min-h-[160px] font-sans text-[15px] leading-relaxed text-mk-muted"
            inputClassName="text-[15px] leading-relaxed"
          />
        </div>
      </section>
    );
  }

  const paragraphs = description?.trim()
    ? description.split(/\n\n+/).filter(Boolean)
    : [];

  return (
    <section>
      <h2 className="font-sans text-lg font-semibold text-mk-ink">
        About {businessName}
      </h2>
      <div className="mt-4 flex flex-col gap-4">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="font-sans text-[15px] leading-relaxed text-mk-muted whitespace-pre-line"
            >
              {paragraph}
            </p>
          ))
        ) : (
          <p className="font-sans text-[15px] leading-relaxed text-mk-muted">
            No description added yet.
          </p>
        )}
      </div>
    </section>
  );
}
