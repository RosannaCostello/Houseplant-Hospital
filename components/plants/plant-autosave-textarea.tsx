"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
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
  /** View-only (e.g. collected plants). */
  readOnly?: boolean;
  lockedMessage?: string;
};

export function PlantAutosaveTextarea({
  label,
  ariaLabel,
  placeholder,
  initialValue,
  onSave,
  debounceMs = 1200,
  rows = 4,
  minHeightClassName = "min-h-[6rem]",
  maxLength,
  showCount = false,
  readOnly = false,
  lockedMessage = "Locked after collection.",
}: PlantAutosaveTextareaProps) {
  const [content, setContent] = useState(initialValue);
  const [lastSaved, setLastSaved] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSaveRef = useRef(onSave);
  const contentRef = useRef(content);
  const lastSavedRef = useRef(lastSaved);
  const saveInFlightRef = useRef(false);
  const pendingResaveRef = useRef(false);

  onSaveRef.current = onSave;
  contentRef.current = content;
  lastSavedRef.current = lastSaved;

  useEffect(() => {
    if (contentRef.current !== lastSavedRef.current) {
      return;
    }
    if (initialValue === lastSavedRef.current) {
      return;
    }
    setContent(initialValue);
    setLastSaved(initialValue);
    setStatus("idle");
    setError(null);
  }, [initialValue]);

  const flushSave = useCallback(async () => {
    if (readOnly) return;
    if (saveInFlightRef.current) {
      pendingResaveRef.current = true;
      return;
    }

    const toSave = contentRef.current;
    if (toSave === lastSavedRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    pendingResaveRef.current = false;
    setStatus("saving");
    setError(null);

    const result = await onSaveRef.current(toSave);

    saveInFlightRef.current = false;

    if (!result.success) {
      setError(result.error);
      setStatus("error");
      return;
    }

    setLastSaved(toSave);
    lastSavedRef.current = toSave;

    if (pendingResaveRef.current || contentRef.current !== toSave) {
      pendingResaveRef.current = false;
      setStatus("idle");
      void flushSave();
      return;
    }

    setStatus("saved");
  }, [readOnly]);

  useEffect(() => {
    if (readOnly) {
      return;
    }
    if (content === lastSaved) {
      return;
    }

    const timer = window.setTimeout(() => {
      void flushSave();
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [content, lastSaved, debounceMs, readOnly, flushSave]);

  useEffect(() => {
    if (status !== "saved") {
      return;
    }

    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleChange = useCallback(
    (value: string) => {
      if (readOnly) return;
      const next = maxLength != null ? value.slice(0, maxLength) : value;
      setContent(next);
      setStatus((current) => (current === "error" ? "idle" : current));
      if (error) {
        setError(null);
      }
    },
    [maxLength, error, readOnly],
  );

  const textarea = (
    <textarea
      className={cn(
        hildaInputClassName,
        minHeightClassName,
        "resize-y py-2.5",
        !label && "w-full",
        readOnly && "cursor-default bg-hilda-bg text-hilda-text",
      )}
      name="content"
      rows={rows}
      placeholder={readOnly ? undefined : placeholder}
      value={content}
      maxLength={maxLength}
      readOnly={readOnly}
      aria-readonly={readOnly || undefined}
      aria-label={label ? undefined : ariaLabel}
      onChange={(event) => handleChange(event.target.value)}
    />
  );

  return (
    <div className="space-y-1">
      {label ? (
        <label className={hildaLabelClassName}>
          {label}
          {textarea}
        </label>
      ) : (
        textarea
      )}

      <div className="flex min-h-4 items-start justify-between gap-2 text-xs text-hilda-text-muted">
        <div aria-live="polite">
          {readOnly ? lockedMessage : null}
          {!readOnly && status === "saving" ? "Saving…" : null}
          {!readOnly && status === "saved" ? "Saved" : null}
          {!readOnly && status === "error" && error ? (
            <span className="text-hilda-error-text">{error}</span>
          ) : null}
        </div>
        {!readOnly && showCount && maxLength != null ? (
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
