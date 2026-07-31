"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  PACKAGE_UNITS,
  packageUnitAllowsMinQuantity,
  type PackageUnit,
} from "@kritva/types/enums";
import { InlineEditField } from "@/components/vendor/edit/InlineEditField";
import { buttonVariants } from "@/components/ui/button";
import {
  formatUnit,
  paisaToRupees,
  rupeesToPaisa,
  type VendorPackage,
} from "@/lib/vendor-profile";
import { formatInr } from "@/lib/booking-form";
import { cn } from "@/lib/utils";

function PriceInput({
  paisa,
  onChange,
}: {
  paisa: number;
  onChange: (paisa: number) => void;
}) {
  const [raw, setRaw] = useState(() =>
    paisa === 0 ? "" : paisaToRupees(paisa),
  );

  useEffect(() => {
    setRaw(paisa === 0 ? "" : paisaToRupees(paisa));
  }, [paisa]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-sans text-meta text-mk-muted">
        ₹
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => {
          const value = e.target.value;
          if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
          setRaw(value);
          const parsed = rupeesToPaisa(value);
          if (parsed != null) onChange(parsed);
          else if (value.trim() === "") onChange(0);
        }}
        onBlur={() => {
          const parsed = rupeesToPaisa(raw);
          if (parsed != null) {
            onChange(parsed);
            setRaw(parsed === 0 ? "" : paisaToRupees(parsed));
          } else {
            onChange(0);
            setRaw("");
          }
        }}
        placeholder="0"
        className="h-8 w-full rounded-md border border-mk-border bg-white pl-6 pr-2 font-sans text-meta text-mk-ink"
      />
    </div>
  );
}

function InclusionsEditor({
  inclusions,
  onChange,
}: {
  inclusions: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {inclusions.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex items-center justify-between gap-2 rounded-md bg-mk-surface-2 px-2 py-1 font-sans text-label text-mk-ink"
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => onChange(inclusions.filter((_, i) => i !== index))}
              className="text-mk-muted hover:text-rose-600"
              aria-label="Remove inclusion"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {inclusions.length < 20 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const trimmed = draft.trim();
                if (!trimmed) return;
                onChange([...inclusions, trimmed]);
                setDraft("");
              }
            }}
            placeholder="Add inclusion, press Enter"
            className="h-8 flex-1 rounded-md border border-mk-border bg-white px-2 font-sans text-meta text-mk-ink"
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = draft.trim();
              if (!trimmed) return;
              onChange([...inclusions, trimmed]);
              setDraft("");
            }}
            className="rounded-md border border-mk-border px-2 font-sans text-label font-medium text-mk-ink hover:bg-mk-surface-2"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

interface PackagesSectionProps {
  packages?: VendorPackage[];
  editable?: boolean;
  onPackageChange?: (id: string, patch: Partial<VendorPackage>) => void;
  onAddPackage?: () => void;
  onDeactivatePackage?: (id: string) => void;
  onReactivatePackage?: (id: string) => void;
  onRemoveLocalPackage?: (id: string) => void;
}

export function PackagesSection({
  packages = [],
  editable = false,
  onPackageChange,
  onAddPackage,
  onDeactivatePackage,
  onReactivatePackage,
  onRemoveLocalPackage,
}: PackagesSectionProps) {
  const active = packages.filter((pkg) => pkg.is_active !== false);
  const inactive = packages.filter((pkg) => pkg.is_active === false);

  function renderCard(pkg: VendorPackage, isInactive: boolean) {
    const showMinQty = packageUnitAllowsMinQuantity(pkg.unit);

    return (
      <div
        key={pkg.id}
        className={cn(
          "rounded-lg border border-mk-border bg-white p-4",
          isInactive && "opacity-70",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            {editable && onPackageChange && !isInactive ? (
              <InlineEditField
                value={pkg.name}
                onChange={(name) => onPackageChange(pkg.id, { name })}
                className="font-sans text-body font-semibold text-mk-ink"
              />
            ) : (
              <h3 className="font-sans text-body font-semibold text-mk-ink">
                {pkg.name}
              </h3>
            )}

            {editable && onPackageChange && !isInactive ? (
              <InlineEditField
                value={pkg.description ?? ""}
                onChange={(description) =>
                  onPackageChange(pkg.id, { description })
                }
                multiline
                className="font-sans text-meta text-mk-muted"
                placeholder="Description"
              />
            ) : (
              pkg.description && (
                <p className="font-sans text-meta text-mk-muted">
                  {pkg.description}
                </p>
              )
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 font-sans text-label font-semibold uppercase tracking-wider text-mk-muted">
                  Price
                </p>
                {editable && onPackageChange && !isInactive ? (
                  <PriceInput
                    paisa={pkg.price}
                    onChange={(price) => onPackageChange(pkg.id, { price })}
                  />
                ) : (
                  <p className="font-sans text-meta text-mk-ink">
                    {formatInr(pkg.price)}
                    <span className="text-mk-muted">
                      {" "}
                      / {formatUnit(pkg.unit)}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <p className="mb-1 font-sans text-label font-semibold uppercase tracking-wider text-mk-muted">
                  Unit
                </p>
                {editable && onPackageChange && !isInactive ? (
                  <select
                    value={pkg.unit}
                    onChange={(e) =>
                      onPackageChange(pkg.id, {
                        unit: e.target.value as PackageUnit,
                      })
                    }
                    className="h-8 w-full rounded-md border border-mk-border bg-white px-2 font-sans text-meta text-mk-ink"
                  >
                    {PACKAGE_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {formatUnit(unit)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-sans text-meta capitalize text-mk-ink">
                    {formatUnit(pkg.unit)}
                  </p>
                )}
              </div>

              {showMinQty && (
                <div>
                  <p className="mb-1 font-sans text-label font-semibold uppercase tracking-wider text-mk-muted">
                    Minimum{" "}
                    {pkg.unit === "per_plate" ? "plates" : "guests"}
                  </p>
                  {editable && onPackageChange && !isInactive ? (
                    <input
                      type="number"
                      min={1}
                      value={pkg.min_quantity ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        onPackageChange(pkg.id, {
                          min_quantity:
                            value === ""
                              ? null
                              : Math.max(1, Number.parseInt(value, 10) || 1),
                        });
                      }}
                      className="h-8 w-full rounded-md border border-mk-border bg-white px-2 font-sans text-meta text-mk-ink"
                    />
                  ) : (
                    <p className="font-sans text-meta text-mk-ink">
                      {pkg.min_quantity ?? "—"}
                    </p>
                  )}
                </div>
              )}
            </div>

            {((editable && onPackageChange && !isInactive) ||
              (pkg.inclusions?.length ?? 0) > 0) && (
              <div>
                <p className="mb-1 font-sans text-label font-semibold uppercase tracking-wider text-mk-muted">
                  Inclusions
                </p>
                {editable && onPackageChange && !isInactive ? (
                  <InclusionsEditor
                    inclusions={pkg.inclusions ?? []}
                    onChange={(inclusions) =>
                      onPackageChange(pkg.id, { inclusions })
                    }
                  />
                ) : (
                  <ul className="list-inside list-disc font-sans text-meta text-mk-ink">
                    {pkg.inclusions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {editable && (
            <div className="flex shrink-0 flex-col gap-2">
              {isInactive ? (
                onReactivatePackage && (
                  <button
                    type="button"
                    onClick={() => onReactivatePackage(pkg.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-mk-border px-2.5 py-1.5 font-sans text-label font-medium text-mk-ink hover:bg-mk-surface-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reactivate
                  </button>
                )
              ) : pkg.id.startsWith("local-") ? (
                onRemoveLocalPackage && (
                  <button
                    type="button"
                    onClick={() => onRemoveLocalPackage(pkg.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-2.5 py-1.5 font-sans text-label font-medium text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )
              ) : (
                onDeactivatePackage && (
                  <button
                    type="button"
                    onClick={() => onDeactivatePackage(pkg.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-2.5 py-1.5 font-sans text-label font-medium text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Deactivate
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-sans text-body font-semibold text-mk-ink">
          Packages
        </h2>
        {editable && onAddPackage && (
          <button
            type="button"
            onClick={onAddPackage}
            className="inline-flex items-center gap-1.5 rounded-md bg-mk-navy px-3 py-2 font-sans text-label font-semibold text-white hover:bg-mk-navy/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add package
          </button>
        )}
      </div>

      {active.length === 0 ? (
        <div className="rounded-lg border border-dashed border-mk-border px-4 py-8 text-center">
          <p className="font-sans text-meta text-mk-muted">
            {editable
              ? "No active packages yet. Add your first offering below."
              : "No packages listed yet."}
          </p>
          {editable && onAddPackage && (
            <button
              type="button"
              onClick={onAddPackage}
              className="mt-3 inline-flex items-center gap-1.5 font-sans text-meta font-medium text-mk-navy"
            >
              <Plus className="h-4 w-4" />
              Add package
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((pkg) => renderCard(pkg, false))}
        </div>
      )}

      {editable && inactive.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-sans text-label font-semibold uppercase tracking-wider text-mk-muted">
            Inactive packages
          </h3>
          {inactive.map((pkg) => renderCard(pkg, true))}
        </div>
      )}
    </section>
  );
}

/** Public profile: clear price + inclusions list (plain.md). */
export function PublicPackagesList({
  packages,
}: {
  packages: VendorPackage[];
}) {
  const active = packages.filter((pkg) => pkg.is_active !== false);
  if (active.length === 0) return null;

  return (
    <div className="space-y-4">
      {active.map((pkg) => (
        <article
          key={pkg.id}
          className="rounded-lg border border-mk-border bg-mk-surface p-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-subhead text-mk-ink">{pkg.name}</h3>
            <p className="text-money text-mk-ink">
              {formatInr(pkg.price)}
              <span className="text-meta font-normal text-mk-muted">
                {" "}
                / {formatUnit(pkg.unit)}
              </span>
            </p>
          </div>
          {pkg.description ? (
            <p className="mt-1.5 text-body text-mk-muted">{pkg.description}</p>
          ) : null}
          {(pkg.inclusions?.length ?? 0) > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-body text-mk-ink marker:text-mk-muted">
              {pkg.inclusions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4">
            <a
              href="#book"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Select
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
