"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { InfoDefinitionButton } from "@/components/analytics/info-definition-button";
import {
  chartCurrentPeriodLabelForPreset,
  chartPreviousPeriodLabelForPreset,
  chartPreviousPeriodPhraseForPreset,
  type AnalyticsPreset,
} from "@/lib/analytics/date-range";
import type {
  AnalyticsBucket,
  AnalyticsSeriesPoint,
  AnalyticsSizeBreakdown,
} from "@/lib/analytics/types";
import { formatGbp } from "@/lib/pricing/format-gbp";

type AnalyticsChartsProps = {
  series: AnalyticsSeriesPoint[];
  previousSeries: AnalyticsSeriesPoint[];
  sizeBreakdown: AnalyticsSizeBreakdown[];
  bucket: AnalyticsBucket;
  rangeLabel: string;
  preset: AnalyticsPreset;
};

const THROUGHPUT_STROKE = 2.5;
const PREVIOUS_SERIES_OPACITY = 0.25;

function ChartLineLegend({
  payload,
  previousLabels,
}: {
  payload?: ReadonlyArray<{ value?: string; color?: string }>;
  previousLabels: ReadonlySet<string>;
}) {
  if (!payload?.length) return null;

  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-hilda-text">
      {payload.map((entry) => {
        const label = entry.value ?? "";
        const isPrevious = previousLabels.has(label);
        return (
          <li key={label} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-[2.5px] w-5 rounded-full"
              style={{
                backgroundColor: entry.color,
                opacity: isPrevious ? PREVIOUS_SERIES_OPACITY : 1,
              }}
            />
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function shortDate(value: string, bucket: AnalyticsBucket): string {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: bucket === "month" ? undefined : "numeric",
    month: "short",
    year: bucket === "month" ? "2-digit" : undefined,
    timeZone: "UTC",
  }).format(date);
}

export function AnalyticsCharts({
  series,
  previousSeries,
  sizeBreakdown,
  bucket,
  rangeLabel,
  preset,
}: AnalyticsChartsProps) {
  const previousPhrase = chartPreviousPeriodPhraseForPreset(preset);
  const previousCheckedInLabel = `Checked-in ${previousPhrase}`;
  const previousCollectedLabel = `Collected ${previousPhrase}`;
  const currentPeriodLabel = chartCurrentPeriodLabelForPreset(preset);
  const previousPeriodLabel = chartPreviousPeriodLabelForPreset(preset);
  const previousLabels = new Set([
    previousCheckedInLabel,
    previousCollectedLabel,
    previousPeriodLabel,
  ]);
  const trendData = series.map((point, index) => ({
    ...point,
    dateLabel: shortDate(point.bucket, bucket),
    previousCheckedIn: previousSeries[index]?.checkedIn ?? null,
    previousCollected: previousSeries[index]?.collected ?? null,
    previousRevenue: previousSeries[index]?.revenue ?? null,
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <figure className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4">
        <figcaption>
          <div className="flex items-center gap-1.5">
            <h2 className="font-serif text-xl text-hilda-heading">Plant throughput over time</h2>
            <InfoDefinitionButton
              label="Plant throughput over time"
              definition="Plants checked in and collected, compared with the preceding period."
            />
          </div>
        </figcaption>
        <div className="mt-4 h-72 w-full" aria-label="Plant throughput chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} accessibilityLayer margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--hilda-border)" strokeOpacity={0.14} vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: "var(--hilda-text-muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{ value: "Date", position: "insideBottom", offset: -6 }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--hilda-text-muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={32}
                label={{ value: "Plants", angle: -90, position: "insideLeft" }}
              />
              <Tooltip />
              <Legend
                verticalAlign="top"
                height={48}
                content={(props) => (
                  <ChartLineLegend
                    payload={props.payload as ReadonlyArray<{ value?: string; color?: string }>}
                    previousLabels={previousLabels}
                  />
                )}
              />
              <Line
                name="Checked in"
                type="monotone"
                dataKey="checkedIn"
                stroke="#000000"
                strokeWidth={THROUGHPUT_STROKE}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                name="Collected"
                type="monotone"
                dataKey="collected"
                stroke="var(--hilda-gold)"
                strokeWidth={THROUGHPUT_STROKE}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                name={previousCheckedInLabel}
                type="monotone"
                dataKey="previousCheckedIn"
                stroke="#000000"
                strokeOpacity={PREVIOUS_SERIES_OPACITY}
                strokeWidth={THROUGHPUT_STROKE}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                name={previousCollectedLabel}
                type="monotone"
                dataKey="previousCollected"
                stroke="var(--hilda-gold)"
                strokeOpacity={PREVIOUS_SERIES_OPACITY}
                strokeWidth={THROUGHPUT_STROKE}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-hilda-text-muted">
          Source: Houseplant Hospital visits and collections · {rangeLabel}
        </p>
      </figure>

      <figure className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4">
        <figcaption>
          <div className="flex items-center gap-1.5">
            <h2 className="font-serif text-xl text-hilda-heading">Collected treatment revenue</h2>
            <InfoDefinitionButton
              label="Collected treatment revenue"
              definition="Final plant prices recorded at collection; this is revenue, not profit."
            />
          </div>
        </figcaption>
        <div className="mt-4 h-72 w-full" aria-label="Collected treatment revenue chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} accessibilityLayer margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--hilda-border)" strokeOpacity={0.14} vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: "var(--hilda-text-muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{ value: "Date", position: "insideBottom", offset: -6 }}
              />
              <YAxis
                tickFormatter={(value) => `£${value}`}
                tick={{ fill: "var(--hilda-text-muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={54}
                label={{ value: "Revenue (£)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip formatter={(value) => formatGbp(Number(value))} />
              <Legend
                verticalAlign="top"
                height={36}
                content={(props) => (
                  <ChartLineLegend
                    payload={props.payload as ReadonlyArray<{ value?: string; color?: string }>}
                    previousLabels={previousLabels}
                  />
                )}
              />
              <Line
                name={currentPeriodLabel}
                type="monotone"
                dataKey="revenue"
                stroke="var(--hilda-gold)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                name={previousPeriodLabel}
                type="monotone"
                dataKey="previousRevenue"
                stroke="var(--hilda-gold)"
                strokeOpacity={PREVIOUS_SERIES_OPACITY}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-hilda-text-muted">
          Source: final prices on collected plants · {rangeLabel}
        </p>
      </figure>

      <figure className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4 xl:col-span-2">
        <figcaption>
          <div className="flex items-center gap-1.5">
            <h2 className="font-serif text-xl text-hilda-heading">Checked-in plants by size</h2>
            <InfoDefinitionButton
              label="Checked-in plants by size"
              definition="Size mix for plants entering the Hospital during the selected period."
            />
          </div>
        </figcaption>
        <div className="mt-4 h-64 w-full" aria-label="Checked-in plants by size chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sizeBreakdown} accessibilityLayer margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--hilda-border)" strokeOpacity={0.14} vertical={false} />
              <XAxis
                dataKey="size"
                tick={{ fill: "var(--hilda-text-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{ value: "Plant size", position: "insideBottom", offset: -6 }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--hilda-text-muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={32}
                label={{ value: "Plants", angle: -90, position: "insideLeft" }}
              />
              <Tooltip />
              <Bar name="Plants" dataKey="count" fill="var(--hilda-gold)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-hilda-text-muted">
          Source: plant size recorded at check-in · {rangeLabel}
        </p>
      </figure>
    </div>
  );
}
