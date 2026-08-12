"use client";

import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: boolean | null; label: string }> = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
  { value: null, label: "Not sure" },
];

type BugsFoundToggleFieldProps = {
  /** true = Yes, false = No, null = Not sure, undefined = unanswered (check-in only). */
  value: boolean | null | undefined;
  onChange: (value: boolean | null) => void;
  disabled?: boolean;
  pending?: boolean;
  lockedMessage?: string;
  /** Heading copy — intake vs treatment (HIL-110). */
  question?: string;
  ariaLabel?: string;
};

export function BugsFoundToggleField({
  value,
  onChange,
  disabled = false,
  pending = false,
  lockedMessage = "Locked after collection.",
  question = "Pests found during treatment?",
  ariaLabel,
}: BugsFoundToggleFieldProps) {
  const groupLabel = ariaLabel ?? question;
  const answered = value !== undefined;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
        {question}
      </h2>

      {!disabled ? (
        <div
          className="flex flex-wrap items-stretch gap-2"
          role="radiogroup"
          aria-label={groupLabel}
        >
          {OPTIONS.map((option) => {
            const selected = answered && value === option.value;

            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={selected}
                className={cn(
                  "min-h-11 min-w-[5.5rem] rounded-hilda-sm border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                  selected
                    ? option.value === true
                      ? "border-hilda-bugs bg-hilda-bugs text-hilda-inverse"
                      : option.value === false
                        ? "border-hilda-heading bg-hilda-heading text-hilda-inverse"
                        : "border-hilda-warning-border bg-hilda-warning-bg text-hilda-warning-text"
                    : "border-hilda-border/25 bg-hilda-surface text-hilda-heading hover:border-hilda-border/30",
                )}
                disabled={pending}
                onClick={() => onChange(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : answered && value != null ? (
        <p className="text-xs text-hilda-text-muted">{lockedMessage}</p>
      ) : answered && value == null ? (
        <p className="text-sm font-medium text-hilda-warning-text">Not sure</p>
      ) : (
        <div
          className="inline-flex min-h-11 items-center rounded-hilda-sm border border-dashed border-hilda-warning-border bg-hilda-warning-bg px-3 text-xs font-semibold uppercase tracking-wide text-hilda-warning-text"
          role="status"
        >
          Not recorded
        </div>
      )}
    </div>
  );
}
