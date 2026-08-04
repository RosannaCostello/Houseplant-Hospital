"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ANALYTICS_PRESETS,
  type AnalyticsDateRange,
  type AnalyticsPreset,
} from "@/lib/analytics/date-range";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";

export function AnalyticsFilters({ range }: { range: AnalyticsDateRange }) {
  const [preset, setPreset] = useState<AnalyticsPreset>(range.preset);
  const isCustom = preset === "custom";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      action="/app/analytics"
      method="get"
      className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className={hildaLabelClassName}>
          Period
          <select
            name="preset"
            className={hildaInputClassName}
            value={preset}
            onChange={(event) => setPreset(event.target.value as AnalyticsPreset)}
          >
            {ANALYTICS_PRESETS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {isCustom ? (
          <>
            <label className={hildaLabelClassName}>
              From
              <input
                type="date"
                name="start"
                required
                max={today}
                defaultValue={range.startDate}
                className={hildaInputClassName}
              />
            </label>
            <label className={hildaLabelClassName}>
              To
              <input
                type="date"
                name="end"
                required
                max={today}
                defaultValue={range.endDate}
                className={hildaInputClassName}
              />
            </label>
          </>
        ) : null}

        <Button type="submit" className="lg:mb-px">
          Apply period
        </Button>

        <div className="text-sm text-hilda-text-muted lg:ml-auto lg:pb-2">
          <p className="font-medium text-hilda-heading">{range.label}</p>
        </div>
      </div>
    </form>
  );
}
