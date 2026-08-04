"use client";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
] as const;

type BugsFoundToggleFieldProps = {
  value: boolean | null;
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
  const showClear = !disabled && value !== null;
  const groupLabel = ariaLabel ?? question;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
        {question}
      </h2>

      {!disabled ? (
        <>
          <div
            className="flex flex-wrap items-stretch gap-2"
            role="radiogroup"
            aria-label={groupLabel}
          >
            {OPTIONS.map((option) => {
              const selected = value === option.value;

              return (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    "min-h-11 min-w-[5.5rem] rounded-hilda-sm border px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                    selected
                      ? option.value
                        ? "border-hilda-bugs bg-hilda-bugs text-hilda-inverse"
                        : "border-hilda-heading bg-hilda-heading text-hilda-inverse"
                      : "border-hilda-border/25 bg-hilda-surface text-hilda-heading hover:border-hilda-border/30",
                  )}
                  disabled={pending}
                  onClick={() => onChange(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
            {value == null ? (
              <div
                className="inline-flex min-h-11 items-center rounded-hilda-sm border border-dashed border-hilda-warning-border bg-hilda-warning-bg px-3 text-xs font-semibold uppercase tracking-wide text-hilda-warning-text"
                role="status"
              >
                Not checked yet
              </div>
            ) : null}
          </div>

          {showClear ? (
            <button
              type="button"
              className="min-h-11 text-sm font-medium text-hilda-text underline-offset-2 hover:text-hilda-heading hover:underline disabled:opacity-50"
              disabled={pending}
              onClick={() => onChange(null)}
            >
              Clear answer
            </button>
          ) : null}
        </>
      ) : value != null ? (
        <p className="text-xs text-hilda-text-muted">{lockedMessage}</p>
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
