"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { SERVICE_UNITS } from "@kritva/types/enums";
import { InlineEditField } from "@/components/vendor/edit/InlineEditField";
import { formatUnit, paisaToRupees, rupeesToPaisa } from "@/lib/vendor-profile";
import type { VendorService } from "@/lib/vendor-profile";

type Currency = "INR" | "GBP";

const GBP_RATE = 105;

interface ServiceRow {
  id: string;
  name: string;
  description: string;
  priceMinPaisa: number;
  priceMaxPaisa: number;
  unit: string;
}


function formatPrice(paisa: number, currency: Currency): string {
  const rupees = Math.round(paisa / 100);
  if (currency === "INR") {
    return `₹${rupees.toLocaleString("en-IN")}`;
  }
  const gbp = Math.round(rupees / GBP_RATE);
  return `£${gbp.toLocaleString("en-GB")}`;
}

interface ServicesTableProps {
  services?: {
    id: string;
    name: string;
    description: string | null;
    price_min: number;
    price_max?: number;
    unit: string;
  }[];
  editable?: boolean;
  onServiceChange?: (id: string, patch: Partial<VendorService>) => void;
  onAddService?: () => void;
  onRemoveService?: (id: string) => void;
}

export function ServicesTable({
  services,
  editable = false,
  onServiceChange,
  onAddService,
  onRemoveService,
}: ServicesTableProps) {
  const [currency, setCurrency] = useState<Currency>("INR");

  const rows: ServiceRow[] =
    services && services.length > 0
      ? services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? "—",
          priceMinPaisa: s.price_min,
          priceMaxPaisa: s.price_max ?? s.price_min,
          unit: s.unit,
        }))
      : [];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-lg font-semibold text-mk-ink">
          Detailed Services &amp; Pricing
        </h2>
        {!editable && (
          <div className="relative sm:hidden">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              aria-label="Currency"
              className="appearance-none rounded-md border border-mk-border bg-white py-1 pr-7 pl-2.5 font-sans text-xs font-medium text-mk-ink"
            >
              <option value="INR">INR</option>
              <option value="GBP">GBP</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-mk-muted" />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-mk-border bg-white">
        <div
          className={`hidden border-b border-mk-border bg-[#FAF7F0] px-4 py-3 sm:grid sm:gap-4 ${
            editable
              ? "sm:grid-cols-[1fr_1.4fr_0.9fr_0.9fr_0.8fr_40px]"
              : "sm:grid-cols-[1.1fr_1.6fr_1fr_0.8fr]"
          }`}
        >
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted">
            Name
          </span>
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted">
            Description
          </span>
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted">
            {editable ? "Min (₹)" : "Pricing"}
          </span>
          {editable ? (
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted">
              Max (₹)
            </span>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted">
                Pricing
              </span>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  aria-label="Currency"
                  className="appearance-none rounded-md border border-mk-border bg-white py-0.5 pr-6 pl-2 font-sans text-[11px] font-medium text-mk-ink"
                >
                  <option value="INR">INR</option>
                  <option value="GBP">GBP</option>
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2 text-mk-muted" />
              </div>
            </div>
          )}
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted">
            Unit
          </span>
          {editable ? <span /> : null}
        </div>

        <div className="divide-y divide-mk-border">
          {rows.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-mk-muted">
              {editable
                ? "No services yet. Add your first offering below."
                : "No services listed yet."}
            </p>
          )}

          {rows.map((row) => (
            <div
              key={row.id}
              className={`grid gap-3 px-4 py-4 sm:items-center sm:gap-4 ${
                editable
                  ? "sm:grid-cols-[1fr_1.4fr_0.9fr_0.9fr_0.8fr_40px]"
                  : "sm:grid-cols-[1.1fr_1.6fr_1fr_0.8fr]"
              }`}
            >
              <div>
                <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted sm:hidden">
                  Name
                </p>
                {editable && onServiceChange ? (
                  <InlineEditField
                    value={row.name}
                    onChange={(name) => onServiceChange(row.id, { name })}
                    className="font-sans text-sm font-semibold text-mk-ink"
                  />
                ) : (
                  <p className="font-sans text-sm font-semibold text-mk-ink">
                    {row.name}
                  </p>
                )}
              </div>

              <div>
                <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted sm:hidden">
                  Description
                </p>
                {editable && onServiceChange ? (
                  <InlineEditField
                    value={row.description === "—" ? "" : row.description}
                    onChange={(description) =>
                      onServiceChange(row.id, { description })
                    }
                    multiline
                    rows={2}
                    className="font-sans text-sm leading-relaxed text-mk-muted"
                  />
                ) : (
                  <p className="font-sans text-sm leading-relaxed text-mk-muted">
                    {row.description}
                  </p>
                )}
              </div>

              <div>
                <p className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted sm:hidden">
                  {editable ? "Min (₹)" : "Pricing"}
                </p>
                {editable && onServiceChange ? (
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paisaToRupees(row.priceMinPaisa)}
                    onChange={(e) => {
                      const paisa = rupeesToPaisa(e.target.value);
                      if (paisa != null) {
                        onServiceChange(row.id, { price_min: paisa });
                      }
                    }}
                    className="h-8 w-full rounded-md border border-mk-border bg-white px-2 font-sans text-sm text-mk-ink"
                  />
                ) : (
                  <p className="font-sans text-sm font-semibold text-mk-ink">
                    From {formatPrice(row.priceMinPaisa, currency)}
                  </p>
                )}
              </div>

              {editable && onServiceChange ? (
                <div>
                  <p className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted sm:hidden">
                    Max (₹)
                  </p>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paisaToRupees(row.priceMaxPaisa)}
                    onChange={(e) => {
                      const paisa = rupeesToPaisa(e.target.value);
                      if (paisa != null) {
                        onServiceChange(row.id, { price_max: paisa });
                      }
                    }}
                    className="h-8 w-full rounded-md border border-mk-border bg-white px-2 font-sans text-sm text-mk-ink"
                  />
                </div>
              ) : null}

              <div>
                <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted sm:hidden">
                  Service Unit
                </p>
                {editable && onServiceChange ? (
                  <select
                    value={row.unit}
                    onChange={(e) =>
                      onServiceChange(row.id, { unit: e.target.value })
                    }
                    className="h-8 w-full rounded-md border border-mk-border bg-white px-2 font-sans text-sm capitalize text-mk-ink"
                  >
                    {SERVICE_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {formatUnit(unit)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-sans text-sm capitalize text-mk-ink">
                    {formatUnit(row.unit)}
                  </p>
                )}
              </div>

              {editable && onRemoveService ? (
                <button
                  type="button"
                  onClick={() => onRemoveService(row.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                  aria-label="Remove service"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {editable && onAddService && (
        <button
          type="button"
          onClick={onAddService}
          className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-mk-border px-4 py-2.5 font-sans text-sm font-medium text-mk-ink hover:bg-[#FAF7F0]"
        >
          <Plus className="h-4 w-4" />
          Add service
        </button>
      )}
    </section>
  );
}
