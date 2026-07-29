import {
  addDays,
  differenceInCalendarDays,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import type { AnalyticsBucket } from "@/lib/analytics/types";

export const ANALYTICS_TIMEZONE = "Europe/London";

export const ANALYTICS_PRESETS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom" },
] as const;

export type AnalyticsPreset = (typeof ANALYTICS_PRESETS)[number]["value"];

const PREVIOUS_PERIOD_NAME_BY_PRESET: Record<AnalyticsPreset, string> = {
  today: "previous day",
  this_week: "previous week",
  last_30_days: "previous 30 days",
  this_month: "previous month",
  this_year: "previous year",
  custom: "previous period",
};

export function previousPeriodNameForPreset(preset: AnalyticsPreset): string {
  return PREVIOUS_PERIOD_NAME_BY_PRESET[preset];
}

/** Short phrase for chart legends, e.g. "last month", "last 30 days". */
const CHART_PREVIOUS_PERIOD_PHRASE_BY_PRESET: Record<AnalyticsPreset, string> = {
  today: "yesterday",
  this_week: "last week",
  last_30_days: "previous 30 days",
  this_month: "last month",
  this_year: "last year",
  custom: "previous period",
};

export function chartPreviousPeriodPhraseForPreset(preset: AnalyticsPreset): string {
  return CHART_PREVIOUS_PERIOD_PHRASE_BY_PRESET[preset];
}

const CHART_CURRENT_PERIOD_LABEL_BY_PRESET: Record<AnalyticsPreset, string> = {
  today: "Today",
  this_week: "This week",
  last_30_days: "Last 30 days",
  this_month: "This month",
  this_year: "This year",
  custom: "Selected period",
};

export function chartCurrentPeriodLabelForPreset(preset: AnalyticsPreset): string {
  return CHART_CURRENT_PERIOD_LABEL_BY_PRESET[preset];
}

export function chartPreviousPeriodLabelForPreset(preset: AnalyticsPreset): string {
  const phrase = chartPreviousPeriodPhraseForPreset(preset);
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

export function comparisonSuffixForPreset(preset: AnalyticsPreset): string {
  return ` vs ${previousPeriodNameForPreset(preset)}`;
}

export type AnalyticsDateRange = {
  preset: AnalyticsPreset;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  startDate: string;
  endDate: string;
  bucket: AnalyticsBucket;
  label: string;
  previousLabel: string;
};

function isPreset(value: string | undefined): value is AnalyticsPreset {
  return ANALYTICS_PRESETS.some((preset) => preset.value === value);
}

function bucketForRange(start: Date, end: Date): AnalyticsBucket {
  const days = differenceInCalendarDays(end, start);
  if (days <= 62) return "day";
  if (days <= 370) return "week";
  return "month";
}

function londonDate(value: Date): string {
  return formatInTimeZone(value, ANALYTICS_TIMEZONE, "yyyy-MM-dd");
}

function displayRange(startDate: string, endDate: string): string {
  const startLabel = formatInTimeZone(
    new Date(`${startDate}T12:00:00Z`),
    "UTC",
    "d MMM yyyy",
  );
  const endLabel = formatInTimeZone(new Date(`${endDate}T12:00:00Z`), "UTC", "d MMM yyyy");
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

function parseCustomDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  if (!isValid(parsed) || value.length !== 10) return null;
  return parsed;
}

export function resolveAnalyticsDateRange(
  input: { preset?: string; start?: string; end?: string },
  now = new Date(),
): AnalyticsDateRange {
  const preset = isPreset(input.preset) ? input.preset : "this_month";
  const londonNow = toZonedTime(now, ANALYTICS_TIMEZONE);
  let localStart: Date;
  let end: Date;
  let previousStart: Date | null = null;
  let previousEnd: Date | null = null;

  switch (preset) {
    case "today":
      localStart = startOfDay(londonNow);
      end = now;
      previousStart = fromZonedTime(subDays(localStart, 1), ANALYTICS_TIMEZONE);
      previousEnd = fromZonedTime(subDays(londonNow, 1), ANALYTICS_TIMEZONE);
      break;
    case "this_week":
      localStart = startOfWeek(londonNow, { weekStartsOn: 1 });
      end = now;
      previousStart = fromZonedTime(subWeeks(localStart, 1), ANALYTICS_TIMEZONE);
      previousEnd = fromZonedTime(subWeeks(londonNow, 1), ANALYTICS_TIMEZONE);
      break;
    case "last_30_days":
      localStart = startOfDay(subDays(londonNow, 29));
      end = now;
      break;
    case "this_year":
      localStart = startOfYear(londonNow);
      end = now;
      previousStart = fromZonedTime(subYears(localStart, 1), ANALYTICS_TIMEZONE);
      previousEnd = fromZonedTime(subYears(londonNow, 1), ANALYTICS_TIMEZONE);
      break;
    case "custom": {
      const customStart = parseCustomDate(input.start);
      const customEnd = parseCustomDate(input.end);

      if (
        !customStart ||
        !customEnd ||
        customStart > customEnd ||
        differenceInCalendarDays(customEnd, customStart) > 1826
      ) {
        return resolveAnalyticsDateRange({ preset: "this_month" }, now);
      }

      localStart = startOfDay(customStart);
      end = fromZonedTime(addDays(startOfDay(customEnd), 1), ANALYTICS_TIMEZONE);
      break;
    }
    case "this_month":
    default:
      localStart = startOfMonth(londonNow);
      end = now;
      previousStart = fromZonedTime(subMonths(localStart, 1), ANALYTICS_TIMEZONE);
      previousEnd = fromZonedTime(subMonths(londonNow, 1), ANALYTICS_TIMEZONE);
      break;
  }

  const start = fromZonedTime(localStart, ANALYTICS_TIMEZONE);
  const safeEnd = end > start ? end : new Date(start.getTime() + 1);
  const safePreviousEnd = previousEnd ?? start;
  const safePreviousStart =
    previousStart ?? new Date(safePreviousEnd.getTime() - (safeEnd.getTime() - start.getTime()));
  const startDate = londonDate(start);
  const endDate =
    preset === "custom" && input.end ? input.end : londonDate(new Date(safeEnd.getTime() - 1));
  const previousStartDate = londonDate(safePreviousStart);
  const previousEndDate = londonDate(new Date(safePreviousEnd.getTime() - 1));

  return {
    preset,
    start,
    end: safeEnd,
    previousStart: safePreviousStart,
    previousEnd: safePreviousEnd,
    startDate,
    endDate,
    bucket: bucketForRange(start, safeEnd),
    label: displayRange(startDate, endDate),
    previousLabel: displayRange(previousStartDate, previousEndDate),
  };
}
