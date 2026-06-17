import { formatGbp } from "@/lib/pricing/format-gbp";
import type { PlantPriceBreakdown } from "@/lib/pricing/types";

type PricingSummarySectionProps = {
  pricing: PlantPriceBreakdown | null;
  isCollected?: boolean;
  finalPrice?: number | null;
};

export function PricingSummarySection({
  pricing,
  isCollected = false,
  finalPrice = null,
}: PricingSummarySectionProps) {
  if (!pricing) {
    return (
      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Pricing</h2>
          <p className="mt-2 text-sm text-amber-800">
            Pricing estimate unavailable. The rest of this plant record is still usable — check admin
            settings or try again later.
          </p>
        </div>
        {isCollected && finalPrice != null ? (
          <dl className="space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-4 border-t border-zinc-100 pt-3">
              <dt className="font-semibold text-zinc-900">Final price charged</dt>
              <dd className="text-base font-semibold tabular-nums text-zinc-900">{formatGbp(finalPrice)}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Pricing</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {isCollected
            ? "Price breakdown at time of estimate. See Collection for the final amount charged."
            : `Estimated treatment price from size band${pricing.lines.length > 0 ? " and adjustments" : ""}.`}
        </p>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-zinc-600">Base treatment ({pricing.size})</dt>
          <dd className="font-medium tabular-nums text-zinc-900">{formatGbp(pricing.baseAmount)}</dd>
        </div>

        {pricing.lines.map((line) => (
          <div key={line.adjustmentType} className="flex items-baseline justify-between gap-4">
            <dt className="text-zinc-600">{line.label}</dt>
            <dd className="font-medium tabular-nums text-zinc-900">+{formatGbp(line.amount)}</dd>
          </div>
        ))}

        <div className="flex items-baseline justify-between gap-4 border-t border-zinc-100 pt-3">
          <dt className="font-semibold text-zinc-900">
            {isCollected && finalPrice != null ? "Final price charged" : "Estimated total"}
          </dt>
          <dd className="text-base font-semibold tabular-nums text-zinc-900">
            {formatGbp(isCollected && finalPrice != null ? finalPrice : pricing.totalAmount)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
