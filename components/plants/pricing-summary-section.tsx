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
    ? "space-y-2 rounded-none border border-hilda-border/15 bg-hilda-surface p-3"
    : "space-y-4 rounded-none border border-hilda-border/15 bg-hilda-surface p-5 shadow-sm";

  const bugsStatusKnown = bugsFound !== null;
  const showFinalCollectedPrice = isCollected && finalPrice != null;

  if (!pricing) {
    return (
      <section className={sectionClass}>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">Pricing</h2>
          {!compact ? (
            <p className="mt-2 text-sm text-hilda-warning-text">
              Pricing estimate unavailable. The rest of this plant record is still usable — check admin
              settings or try again later.
            </p>
          ) : (
            <p className="mt-1 text-xs text-hilda-warning-text">Estimate unavailable.</p>
          )}
        </div>
        {isCollected && finalPrice != null ? (
          <dl className="space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-4 border-t border-hilda-border/10 pt-3">
              <dt className="font-semibold text-hilda-heading">Final price charged</dt>
              <dd className="text-base font-semibold tabular-nums text-hilda-heading">{formatGbp(finalPrice)}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    );
  }

  return (
    <section className={sectionClass}>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">Pricing</h2>
        {!compact ? (
          <p className="mt-1 text-sm text-hilda-text">
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
          <dt className="text-hilda-text">Base treatment ({pricing.size})</dt>
          <dd className="font-medium tabular-nums text-hilda-heading">{formatGbp(pricing.baseAmount)}</dd>
        </div>

        {pricing.lines.map((line) => (
          <div key={line.adjustmentType} className="flex items-baseline justify-between gap-4">
            <dt className="text-hilda-text">{line.label}</dt>
            <dd className="font-medium tabular-nums text-hilda-heading">+{formatGbp(line.amount)}</dd>
          </div>
        ))}

        <div className="flex items-baseline justify-between gap-4 border-t border-hilda-border/10 pt-3">
          <dt className="font-semibold text-hilda-heading">
            {showFinalCollectedPrice ? "Final price charged" : "Total"}
          </dt>
          <dd className="text-base font-semibold tabular-nums text-hilda-heading">
            {showFinalCollectedPrice ? (
              formatGbp(finalPrice)
            ) : bugsStatusKnown ? (
              formatGbp(pricing.totalAmount)
            ) : (
              <span className="text-sm font-medium text-hilda-warning-text">Awaiting bug status</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
