import assert from "node:assert/strict";
import { resolveAnalyticsDateRange } from "../lib/analytics/date-range.ts";

const summerNow = new Date("2026-07-24T20:00:00Z");

const today = resolveAnalyticsDateRange({ preset: "today" }, summerNow);
assert.equal(today.start.toISOString(), "2026-07-23T23:00:00.000Z");
assert.equal(today.end.toISOString(), "2026-07-24T20:00:00.000Z");
assert.equal(today.previousStart.toISOString(), "2026-07-22T23:00:00.000Z");
assert.equal(today.previousEnd.toISOString(), "2026-07-23T20:00:00.000Z");
assert.equal(today.label, "24 Jul 2026");

const month = resolveAnalyticsDateRange({ preset: "this_month" }, summerNow);
assert.equal(month.start.toISOString(), "2026-06-30T23:00:00.000Z");
assert.equal(month.startDate, "2026-07-01");
assert.equal(month.endDate, "2026-07-24");
assert.equal(month.bucket, "day");
assert.equal(month.previousStart.toISOString(), "2026-05-31T23:00:00.000Z");
assert.equal(month.previousEnd.toISOString(), "2026-06-24T20:00:00.000Z");

const dstRange = resolveAnalyticsDateRange(
  { preset: "custom", start: "2026-03-28", end: "2026-03-30" },
  summerNow,
);
assert.equal(dstRange.start.toISOString(), "2026-03-28T00:00:00.000Z");
assert.equal(dstRange.end.toISOString(), "2026-03-30T23:00:00.000Z");
assert.equal(dstRange.label, "28 Mar 2026 – 30 Mar 2026");

const invalidCustom = resolveAnalyticsDateRange(
  { preset: "custom", start: "2026-08-01", end: "2026-07-01" },
  summerNow,
);
assert.equal(invalidCustom.preset, "this_month");

console.log("Analytics date-range checks passed.");
