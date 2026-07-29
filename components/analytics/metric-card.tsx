"use client";

import { InfoDefinitionButton } from "@/components/analytics/info-definition-button";

type MetricCardProps = {
  label: string;
  value: string;
  current: number | null;
  previous: number | null;
  /** Formatted previous-period value shown in brackets after the comparison. */
  previousFormatted?: string | null;
  comparisonSuffix?: string;
  definition: string;
  /** When true, a decrease is good (green) and an increase is bad (red). */
  lowerIsBetter?: boolean;
};

function comparisonLabel(
  current: number | null,
  previous: number | null,
  suffix = "",
  previousFormatted?: string | null,
): { text: string; direction: "up" | "down" | "flat" } {
  const previousHint =
    previous != null && previousFormatted != null && previousFormatted !== ""
      ? ` (${previousFormatted})`
      : "";

  if (current == null || previous == null) {
    return { text: "No comparison", direction: "flat" };
  }
  if (current === previous) {
    return { text: `No change${previousHint}`, direction: "flat" };
  }
  if (previous === 0) {
    return {
      text: current > 0 ? `New this period${suffix}${previousHint}` : `No change${previousHint}`,
      direction: "up",
    };
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;
  return {
    text: `${change > 0 ? "+" : ""}${change.toFixed(Math.abs(change) >= 10 ? 0 : 1)}%${suffix}${previousHint}`,
    direction: change > 0 ? "up" : "down",
  };
}

function comparisonTone(
  direction: "up" | "down" | "flat",
  lowerIsBetter: boolean,
): "good" | "bad" | "flat" {
  if (direction === "flat") {
    return "flat";
  }

  const improved = lowerIsBetter ? direction === "down" : direction === "up";
  return improved ? "good" : "bad";
}

const toneClassName = {
  good: "text-hilda-success-text",
  bad: "text-hilda-error-text",
  flat: "text-hilda-text-muted",
} as const;

export function MetricCard({
  label,
  value,
  current,
  previous,
  previousFormatted,
  comparisonSuffix = " vs previous period",
  definition,
  lowerIsBetter = false,
}: MetricCardProps) {
  const comparison = comparisonLabel(
    current,
    previous,
    comparisonSuffix,
    previousFormatted,
  );
  const tone = comparisonTone(comparison.direction, lowerIsBetter);

  return (
    <article className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4">
      <div className="flex w-full items-center gap-1.5">
        <h2 className="min-w-0 text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
          {label}
        </h2>
        <InfoDefinitionButton label={label} definition={definition} />
      </div>
      <p className="mt-3 font-serif text-3xl tabular-nums text-hilda-heading">{value}</p>
      <p className={`mt-2 text-[11px] font-medium ${toneClassName[tone]}`}>{comparison.text}</p>
    </article>
  );
}
