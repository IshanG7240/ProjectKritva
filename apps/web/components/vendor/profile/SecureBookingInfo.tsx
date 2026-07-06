import { CheckCircle2, Receipt, Shield } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Shield, title: "Smart Contracts" },
  { icon: CheckCircle2, title: "B2G Compliance" },
  { icon: Receipt, title: "GST Invoicing" },
] as const;

export function SecureBookingInfo() {
  return (
    <aside className="rounded-lg border border-mk-border bg-white px-3 py-2.5">
      <p className="mb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-mk-muted">
        Kritva Secure Booking
      </p>
      <ul className="space-y-1.5">
        {TRUST_ITEMS.map(({ icon: Icon, title }) => (
          <li key={title} className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7]">
              <Icon className="h-3.5 w-3.5 text-[#16A34A]" strokeWidth={1.75} />
            </span>
            <span className="font-sans text-xs font-medium leading-tight text-mk-ink">
              {title}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
