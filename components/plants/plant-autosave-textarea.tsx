"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkInInputClassName, checkInLabelClassName } from "@/lib/check-in/form-styles";
import { cn } from "@/lib/utils";

type SaveResult = { success: true } | { success: false; error: string };

type PlantAutosaveTextareaProps = {
  /** Visible label; omit when the section heading already provides the title. */
  label?: string;
  /** Always set for screen readers when `label` is omitted. */
  ariaLabel: string;
  placeholder: string;
  initialValue: string;
  onSave: (content: string) => Promise<SaveResult>;
  debounceMs?: number;
  rows?: number;
  minHeightClassName?: string;
  /** Hard cap; longer input is sliced on change. */
  maxLength?: number;
  /** Show `n/max` counter next to save status (requires maxLength). */
  showCount?: boolean;
};

export function PlantAutosaveTextarea({
  label,
  ariaLabel,
  placeholder,
  initialValue,
  onSave,
  debounceMs = 800,
  rows = 4,
  minHeightClassName = "min-h-[6rem]",
  maxLength,
  showCount = false,
}: PlantAutosaveTextareaProps) {
  const [content, setContent] = useState(initialValue);
  const [lastSaved, setLastSaved] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const onSaveRef = useRef(onSave);

  onSaveRef.current = onSave;

  useEffect(() => {
    if (content !== lastSaved) {
      return;
    }

    setContent(initialValue);
    setLastSaved(initialValue);
    setStatus("idle");
    setError(null);
  }, [initialValue, content, lastSaved]);

  useEffect(() => {
    if (content === lastSaved) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setStatus("saving");
      setError(null);

      const result = await onSaveRef.current(content);

      if (result.success) {
        setLastSaved(content);
        setStatus("saved");
        return;
      }

      setError(result.error);
      setStatus("error");
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [content, lastSaved, debounceMs]);

  useEffect(() => {
    if (status !== "saved") {
      return;
    }

    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleChange = useCallback(
    (value: string) => {
      const next = maxLength != null ? value.slice(0, maxLength) : value;
      setContent(next);
      if (status === "error") {
        setStatus("idle");
        setError(null);
      }
    },
    [status, maxLength],
  );

  const textarea = (
    <textarea
      className={cn(
        checkInInputClassName,
        minHeightClassName,
        "resize-y py-2.5",
        !label && "w-full",
      )}
      name="content"
      rows={rows}
      placeholder={placeholder}
      value={content}
      maxLength={maxLength}
      aria-label={label ? undefined : ariaLabel}
      onChange={(event) => handleChange(event.target.value)}
    />
  );

  return (
    <div className="space-y-1">
      {label ? <label className={checkInLabelClassName}>{label}{textarea}</label> : textarea}

      <div className="flex min-h-4 items-start justify-between gap-2 text-xs text-hilda-text-muted">
        <div aria-live="polite">
          {status === "saving" ? "Saving…" : null}
          {status === "saved" ? "Saved" : null}
          {status === "error" && error ? (
            <span className="text-hilda-error-text">{error}</span>
          ) : null}
        </div>
        {showCount && maxLength != null ? (
          <span
            className={cn(
              "shrink-0 tabular-nums",
              content.length >= maxLength ? "text-hilda-error-text" : undefined,
            )}
          >
            {content.length}/{maxLength}
          </span>
        ) : null}
      </div>
    </div>
  );
}
