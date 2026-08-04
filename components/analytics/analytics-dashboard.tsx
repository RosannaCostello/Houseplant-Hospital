import Link from "next/link";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { AnalyticsFilters } from "@/components/analytics/analytics-filters";
import { InfoDefinitionButton } from "@/components/analytics/info-definition-button";
import { MetricCard } from "@/components/analytics/metric-card";
import { OpenPlantDetailLink } from "@/components/plants/open-plant-detail-link";
import {
  comparisonSuffixForPreset,
  previousPeriodNameForPreset,
  type AnalyticsDateRange,
} from "@/lib/analytics/date-range";
import type { AdminAnalytics } from "@/lib/analytics/types";
import { plantStatusLabel } from "@/lib/plant-status";
import { formatGbp } from "@/lib/pricing/format-gbp";

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatDays(value: number | null): string {
  if (value == null) return "—";
  if (value < 1) return `${Math.round(value * 24)} hrs`;
  return `${value.toFixed(value >= 10 ? 0 : 1)} days`;
}

/** Format average surgery duration (stored as minutes). */
function formatMinutes(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const mins = Math.round(value);
  if (mins < 60) return `${mins} min`;
  const hours = mins / 60;
  if (hours < 48) return `${hours.toFixed(hours >= 10 ? 0 : 1)} hrs`;
  const days = hours / 24;
  return `${days.toFixed(days >= 10 ? 0 : 1)} days`;
}

function paymentLabel(status: string): string {
  switch (status) {
    case "pay_at_collection":
      return "Pay at collection";
    case "queued":
      return "Queued for POS";
    case "loaded":
      return "Loaded in POS";
    default:
      return status;
  }
}

function draftLabel(step: string): string {
  return step === "photos" ? "Waiting for photos" : "Waiting for plant details";
}

export function AnalyticsDashboard({
  analytics,
  range,
}: {
  analytics: AdminAnalytics;
  range: AnalyticsDateRange;
}) {
  const { current, previous } = analytics;
  const comparisonSuffix = comparisonSuffixForPreset(range.preset);
  const pestsRate = current.plantsCheckedIn
    ? (current.pestsFound / current.plantsCheckedIn) * 100
    : null;
  const maxLaneCount = Math.max(1, ...analytics.laneSnapshot.map((lane) => lane.count));

  return (
    <div className="pb-bottom-nav mx-auto w-full max-w-7xl space-y-5">
      <p className="text-xs text-hilda-text-muted">
        Updated{" "}
        {new Date(analytics.range.generatedAt).toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: analytics.range.timezone,
        })}
      </p>

      <AnalyticsFilters range={range} />

      <section aria-labelledby="performance-heading">
        <div className="mb-3">
          <h2 id="performance-heading" className="font-serif text-2xl text-hilda-heading">
            Performance
          </h2>
          <p className="text-sm text-hilda-text-muted">
            {range.label} ({previousPeriodNameForPreset(range.preset)} ={" "}
            {range.previousLabel})
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Treatment revenue"
            value={formatGbp(current.treatmentRevenue)}
            current={current.treatmentRevenue}
            previous={previous.treatmentRevenue}
            previousFormatted={formatGbp(previous.treatmentRevenue)}
            comparisonSuffix={comparisonSuffix}
            definition="Final prices recorded on plants collected during this period. Revenue, not profit."
          />
          <MetricCard
            label="Average collected value"
            value={
              current.averageValuePerCollectedPlant == null
                ? "—"
                : formatGbp(current.averageValuePerCollectedPlant)
            }
            current={current.averageValuePerCollectedPlant}
            previous={previous.averageValuePerCollectedPlant}
            previousFormatted={
              previous.averageValuePerCollectedPlant == null
                ? null
                : formatGbp(previous.averageValuePerCollectedPlant)
            }
            comparisonSuffix={comparisonSuffix}
            definition={`Average final price across ${formatCount(current.pricedCollectedPlants)} priced collected plants.`}
          />
          <MetricCard
            label="Avg time in Surgery"
            value={formatMinutes(current.averageMinutesInSurgery ?? null)}
            current={current.averageMinutesInSurgery ?? null}
            previous={previous.averageMinutesInSurgery ?? null}
            previousFormatted={formatMinutes(previous.averageMinutesInSurgery ?? null)}
            comparisonSuffix={comparisonSuffix}
            lowerIsBetter
            definition="Average time plants spent in In Surgery during this period (from entering surgery until moving to Outpatient or Dead). App check-ins only — historic Zoho imports are excluded. Lower is better."
          />
          <MetricCard
            label="Median turnaround"
            value={formatDays(current.medianTurnaroundDays)}
            current={current.medianTurnaroundDays}
            previous={previous.medianTurnaroundDays}
            previousFormatted={formatDays(previous.medianTurnaroundDays)}
            comparisonSuffix={comparisonSuffix}
            lowerIsBetter
            definition="Middle time from check-in to collection among plants collected in this period."
          />
          <MetricCard
            label="Plants checked in"
            value={formatCount(current.plantsCheckedIn)}
            current={current.plantsCheckedIn}
            previous={previous.plantsCheckedIn}
            previousFormatted={formatCount(previous.plantsCheckedIn)}
            comparisonSuffix={comparisonSuffix}
            definition="Plants belonging to visits checked in during this period."
          />
          <MetricCard
            label="Plants collected"
            value={formatCount(current.plantsCollected)}
            current={current.plantsCollected}
            previous={previous.plantsCollected}
            previousFormatted={formatCount(previous.plantsCollected)}
            comparisonSuffix={comparisonSuffix}
            definition="Plants whose collection was completed during this period."
          />
        </div>
      </section>

      <AnalyticsCharts
        series={analytics.series}
        previousSeries={analytics.previousSeries}
        sizeBreakdown={analytics.sizeBreakdown}
        bucket={analytics.range.bucket}
        rangeLabel={range.label}
        preset={range.preset}
      />

      <section
        aria-labelledby="period-detail-heading"
        className="grid gap-4 lg:grid-cols-3"
      >
        <div className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4">
          <div className="flex items-center gap-1.5">
            <h2 id="period-detail-heading" className="font-serif text-xl text-hilda-heading">
              Customers
            </h2>
            <InfoDefinitionButton
              label="Customers"
              definition="Customers with a visit in this period."
            />
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-hilda-text">Total customers</dt>
              <dd className="font-semibold tabular-nums text-hilda-heading">
                {formatCount(current.uniqueCustomers)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-hilda-text">New customers</dt>
              <dd className="font-semibold tabular-nums text-hilda-heading">
                {formatCount(current.newCustomers)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-hilda-text">Returning customers</dt>
              <dd className="font-semibold tabular-nums text-hilda-heading">
                {formatCount(current.returningCustomers)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4">
          <div className="flex items-center gap-1.5">
            <h2 className="font-serif text-xl text-hilda-heading">Pests</h2>
            <InfoDefinitionButton
              label="Pests"
              definition="Share of checked-in plants where pests were found."
            />
          </div>
          <p className="mt-4 font-serif text-3xl tabular-nums text-hilda-heading">
            {pestsRate == null ? "—" : `${pestsRate.toFixed(1)}%`}
          </p>
          <p className="mt-1 text-sm text-hilda-text">
            {formatCount(current.pestsFound)} of {formatCount(current.plantsCheckedIn)} plants
          </p>
        </div>

        <div className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4">
          <div className="flex items-center gap-1.5">
            <h2 className="font-serif text-xl text-hilda-heading">Propagations</h2>
            <InfoDefinitionButton
              label="Propagations"
              definition="Propagation-category plants checked in during this period."
            />
          </div>
          <p className="mt-4 font-serif text-3xl tabular-nums text-hilda-heading">
            {formatCount(current.propagations)}
          </p>
        </div>
      </section>

      <section aria-labelledby="current-heading" className="space-y-4">
        <div>
          <h2 id="current-heading" className="font-serif text-2xl text-hilda-heading">
            Current operations
          </h2>
          <p className="text-sm text-hilda-text-muted">Live snapshot — not affected by date range.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
          <div className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4">
            <h3 className="font-serif text-xl text-hilda-heading">Active plants by lane</h3>
            <div className="mt-4 space-y-4">
              {analytics.laneSnapshot.map((lane) => (
                <div key={lane.status}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-hilda-heading">
                      {plantStatusLabel(lane.status)}
                    </span>
                    <span className="text-hilda-text-muted">
                      {formatCount(lane.count)} · median {formatDays(lane.medianAgeDays)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-hilda-bg">
                    <div
                      className="h-full rounded-full bg-hilda-gold"
                      style={{ width: `${Math.max(4, (lane.count / maxLaneCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {analytics.laneSnapshot.length === 0 ? (
                <p className="text-sm text-hilda-text-muted">No active plants.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4">
              <h3 className="font-serif text-xl text-hilda-heading">Incomplete check-ins</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {analytics.draftSnapshot.map((draft) => (
                  <div key={draft.step} className="flex justify-between gap-3">
                    <dt className="text-hilda-text">{draftLabel(draft.step)}</dt>
                    <dd className="font-semibold tabular-nums text-hilda-heading">
                      {formatCount(draft.count)}
                    </dd>
                  </div>
                ))}
                {analytics.draftSnapshot.length === 0 ? (
                  <p className="text-hilda-text-muted">No incomplete check-ins.</p>
                ) : null}
              </dl>
            </div>

            <div className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4">
              <h3 className="font-serif text-xl text-hilda-heading">Outstanding payments</h3>
              <p className="mt-1 text-xs text-hilda-text-muted">Visit counts only; no value inferred.</p>
              <dl className="mt-3 space-y-2 text-sm">
                {analytics.paymentSnapshot.map((payment) => (
                  <div key={payment.status} className="flex justify-between gap-3">
                    <dt className="text-hilda-text">{paymentLabel(payment.status)}</dt>
                    <dd className="font-semibold tabular-nums text-hilda-heading">
                      {formatCount(payment.count)}
                    </dd>
                  </div>
                ))}
                {analytics.paymentSnapshot.length === 0 ? (
                  <p className="text-hilda-text-muted">No outstanding payment records.</p>
                ) : null}
              </dl>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-hilda border border-hilda-border/15 bg-hilda-surface">
          <div className="border-b border-hilda-border/10 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif text-xl text-hilda-heading">Oldest active plants</h3>
              <InfoDefinitionButton
                label="Oldest active plants"
                definition="Time in the current lane, longest first."
              />
            </div>
          </div>
          {analytics.oldestActive.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-hilda-bg text-xs uppercase tracking-wide text-hilda-text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Plant</th>
                    <th className="px-4 py-2.5">Lane</th>
                    <th className="px-4 py-2.5 text-right">Time in lane</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hilda-border/10">
                  {analytics.oldestActive.map((plant) => (
                    <tr key={plant.plantId}>
                      <td className="px-4 py-3 font-medium text-hilda-heading">
                        <OpenPlantDetailLink
                          plantId={plant.plantId}
                          className="hover:underline"
                        >
                          {plant.customerName}
                        </OpenPlantDetailLink>
                      </td>
                      <td className="px-4 py-3 text-hilda-text">{plant.plantName || "Unnamed plant"}</td>
                      <td className="px-4 py-3 text-hilda-text">{plantStatusLabel(plant.status)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-hilda-text">
                        {plant.ageDays === 0 ? "Today" : `${plant.ageDays} days`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-sm text-hilda-text-muted">No active plants.</p>
          )}
        </div>
      </section>
    </div>
  );
}
