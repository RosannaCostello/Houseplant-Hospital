import { formatGbp } from "@/lib/pricing/format-gbp";
import type { PlantPriceBreakdown } from "@/lib/pricing/types";

type PricingSummarySectionProps = {
  pricing: PlantPriceBreakdown | null;
  bugsFound?: boolean | null;
  isCollected?: boolean;
  finalPrice?: number | null;
  compact?: boolean;
};

export function PricingSummarySection({
  pricing,
  bugsFound = null,
  isCollected = false,
  finalPrice = null,
  compact = false,
}: PricingSummarySectionProps) {
  const sectionClass = compact
    ? "space-y-2 rounded-none border border-zinc-200 bg-white p-3"
    : "space-y-4 rounded-none border border-zinc-200 bg-white p-5 shadow-sm";

  const bugsStatusKnown = bugsFound !== null;
  const showFinalCollectedPrice = isCollected && finalPrice != null;

  if (!pricing) {
    return (
      <section className={sectionClass}>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pricing</h2>
          {!compact ? (
            <p className="mt-2 text-sm text-amber-800">
              Pricing estimate unavailable. The rest of this plant record is still usable — check admin
              settings or try again later.
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-800">Estimate unavailable.</p>
          )}
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
    <section className={sectionClass}>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pricing</h2>
        {!compact ? (
          <p className="mt-1 text-sm text-zinc-600">
            {isCollected
              ? "Price breakdown at time of estimate."
              : bugsStatusKnown
                ? `Treatment price from size band${pricing.lines.length > 0 ? " and adjustments" : ""}.`
                : "Base treatment shown — total appears once bugs found is answered above."}
          </p>
        ) : null}
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
            {showFinalCollectedPrice ? "Final price charged" : "Total"}
          </dt>
          <dd className="text-base font-semibold tabular-nums text-zinc-900">
            {showFinalCollectedPrice ? (
              formatGbp(finalPrice)
            ) : bugsStatusKnown ? (
              formatGbp(pricing.totalAmount)
            ) : (
              <span className="text-sm font-medium text-amber-800">Awaiting bug status</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
