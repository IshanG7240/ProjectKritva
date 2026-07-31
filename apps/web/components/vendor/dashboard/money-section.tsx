import { formatInr } from "@/lib/booking-form";
import { Card } from "@/components/ui/card";

export function MoneySection({
  heldPaisa,
  releasedPaisa,
  awaitingPaisa,
}: {
  heldPaisa: number;
  releasedPaisa: number;
  awaitingPaisa: number;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <div>
          <dt className="text-label text-mk-muted">Held for you</dt>
          <dd className="mt-1 text-money-lg tabular-nums text-mk-navy">
            {formatInr(heldPaisa)}
          </dd>
        </div>
        <div className="sm:border-l sm:border-mk-line sm:pl-6">
          <dt className="text-label text-mk-muted">Paid out</dt>
          <dd className="mt-1 text-money tabular-nums text-mk-ink">
            {formatInr(releasedPaisa)}
          </dd>
        </div>
        <div className="sm:border-l sm:border-mk-line sm:pl-6">
          <dt className="text-label text-mk-muted">Awaiting reply</dt>
          <dd className="mt-1 text-money tabular-nums text-mk-ink">
            {formatInr(awaitingPaisa)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
