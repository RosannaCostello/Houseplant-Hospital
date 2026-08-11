"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { saveCareTipAction } from "@/app/actions/save-care-tip";
import { AnchoredPortal } from "@/components/ui/anchored-portal";
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

type CareTipPickerProps = {
  category: CareTipCategory;
  value: string;
  options: CareTipOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

/** Custom full-width picker — native iPadOS `<select>` menus stay too narrow for long tip copy. */
function CareTipPicker({ category, value, options, disabled, onChange }: CareTipPickerProps) {
  const listId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const label = CARE_TIP_CATEGORY_LABELS[category];

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      const portal = document.getElementById(listId);
      if (portal?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [listId, open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className="relative">
      <label className={hildaLabelClassName}>
        {label}
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={label}
          className={cn(
            hildaInputClassName,
            "flex w-full min-h-11 items-center justify-between gap-2 text-left",
            !value && "text-hilda-text-muted",
            disabled && "cursor-default bg-hilda-bg",
          )}
          onClick={() => {
            if (!disabled) setOpen((current) => !current);
          }}
        >
          <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">
            {value || "Select…"}
          </span>
          <span aria-hidden className="shrink-0 text-hilda-text-muted">
            ▾
          </span>
        </button>
      </label>

      <AnchoredPortal
        open={open}
        anchorRef={buttonRef}
        maxHeightPx={320}
        className="overflow-hidden rounded-hilda border border-hilda-border/25 bg-hilda-surface shadow-lg"
      >
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="max-h-[inherit] overflow-y-auto overscroll-contain py-1"
        >
          <li role="option" aria-selected={!value}>
            <button
              type="button"
              className={cn(
                "w-full px-3 py-2.5 text-left text-sm leading-snug text-hilda-text-muted hover:bg-hilda-bg",
                !value && "bg-hilda-bg font-medium text-hilda-heading",
              )}
              onClick={() => choose("")}
            >
              Select…
            </button>
          </li>
          {options.map((option) => {
            const selected = option.label === value;
            return (
              <li key={option.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2.5 text-left text-sm leading-snug text-hilda-heading hover:bg-hilda-bg",
                    selected && "bg-hilda-bg font-medium",
                  )}
                  onClick={() => choose(option.label)}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      </AnchoredPortal>
    </div>
  );
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
          <CareTipPicker
            key={category}
            category={category}
            value={selections[category]}
            options={options}
            disabled={readOnly || isPending}
            onChange={(value) => handleChange(category, value)}
          />
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
