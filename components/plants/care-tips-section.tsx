"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { saveCareTipAction } from "@/app/actions/save-care-tip";
import {
  CARE_TIP_CATEGORIES,
  CARE_TIP_CATEGORY_LABELS,
  composeCareTip,
  isCompleteCareTipSelections,
  parseCareTip,
  type CareTipCategory,
  type CareTipSelections,
} from "@/lib/care-tips/compose-parse";
import type { CareTipOption, CareTipOptionsByCategory } from "@/lib/care-tips/types";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import { cn } from "@/lib/utils";

type CareTipsSectionProps = {
  plantId: string;
  careTip: string | null;
  optionsByCategory: CareTipOptionsByCategory;
  embedded?: boolean;
  compact?: boolean;
  readOnly?: boolean;
};

function emptySelections(): CareTipSelections {
  return { water: "", leaves: "", light: "" };
}

function optionsForSelect(
  category: CareTipCategory,
  options: CareTipOption[],
  selected: string,
): CareTipOption[] {
  if (!selected) return options;
  if (options.some((option) => option.label === selected)) return options;
  return [
    {
      id: `legacy-${category}`,
      category,
      label: selected,
      sortOrder: -1,
      active: false,
    },
    ...options,
  ];
}

export function CareTipsSection({
  plantId,
  careTip,
  optionsByCategory,
  embedded = false,
  compact = false,
  readOnly = false,
}: CareTipsSectionProps) {
  const parsed = useMemo(() => parseCareTip(careTip), [careTip]);
  const [selections, setSelections] = useState<CareTipSelections>(() =>
    parsed.kind === "structured" ? parsed.selections : emptySelections(),
  );
  const [legacyNote, setLegacyNote] = useState<string | null>(() =>
    parsed.kind === "legacy" ? parsed.content : null,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const next = parseCareTip(careTip);
    if (next.kind === "structured") {
      setSelections(next.selections);
      setLegacyNote(null);
      return;
    }
    if (next.kind === "legacy") {
      setSelections(emptySelections());
      setLegacyNote(next.content);
      return;
    }
    setSelections(emptySelections());
    setLegacyNote(null);
  }, [careTip]);

  useEffect(() => {
    if (status !== "saved") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const saveSelections = useCallback(
    (next: CareTipSelections) => {
      if (!isCompleteCareTipSelections(next)) {
        return;
      }

      const composed = composeCareTip(next);
      setStatus("saving");
      setError(null);

      startTransition(async () => {
        const result = await saveCareTipAction(plantId, composed);
        if (!result.success) {
          setStatus("error");
          setError(result.error);
          return;
        }
        setLegacyNote(null);
        setStatus("saved");
      });
    },
    [plantId],
  );

  function handleChange(category: CareTipCategory, value: string) {
    if (readOnly) return;
    const next = { ...selections, [category]: value };
    setSelections(next);
    if (status === "error") {
      setStatus("idle");
      setError(null);
    }
    saveSelections(next);
  }

  const body = (
    <div className="space-y-3">
      {CARE_TIP_CATEGORIES.map((category) => {
        const options = optionsForSelect(
          category,
          optionsByCategory[category],
          selections[category],
        );

        return (
          <label key={category} className={hildaLabelClassName}>
            {CARE_TIP_CATEGORY_LABELS[category]}
            <select
              className={cn(hildaInputClassName, "w-full", readOnly && "cursor-default bg-hilda-bg")}
              aria-label={CARE_TIP_CATEGORY_LABELS[category]}
              value={selections[category]}
              disabled={readOnly || isPending}
              onChange={(event) => handleChange(category, event.target.value)}
            >
              <option value="">Select…</option>
              {options.map((option) => (
                <option key={option.id} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}

      {legacyNote ? (
        <p className="rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-3 py-2 text-sm text-hilda-text">
          <span className="font-medium text-hilda-heading">Previous free-text tips: </span>
          {legacyNote}
          {!readOnly ? (
            <span className="mt-1 block text-xs text-hilda-text-muted">
              Choose Water, Leaves, and Light above to replace this text.
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="min-h-4 text-xs text-hilda-text-muted" aria-live="polite">
        {readOnly ? "Locked after collection." : null}
        {!readOnly && (status === "saving" || isPending) ? "Saving…" : null}
        {!readOnly && status === "saved" ? "Saved" : null}
        {!readOnly && status === "error" && error ? (
          <span className="text-hilda-error-text">{error}</span>
        ) : null}
        {!readOnly && status === "idle" && !isCompleteCareTipSelections(selections) ? (
          <span>Select all three to save care tips.</span>
        ) : null}
      </div>
    </div>
  );

  if (embedded) {
    return body;
  }

  const sectionClass = compact
    ? "space-y-3 rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3"
    : "space-y-4 rounded-hilda border border-hilda-border/15 bg-hilda-surface p-5 shadow-sm";

  return (
    <section className={sectionClass}>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
          Care tips
        </h2>
        {!compact && !readOnly ? (
          <p className={cn("mt-1 text-sm text-hilda-text")}>
            Advice for the customer when they collect their plant. Saves automatically when all
            three are chosen.
          </p>
        ) : null}
      </div>
      {body}
    </section>
  );
}
