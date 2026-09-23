"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setPestTypeAction } from "@/app/actions/set-pest-type";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import type { PestTypeOption } from "@/lib/pest-types/types";

type PestTypeFieldProps = {
  plantId: string;
  options: PestTypeOption[];
  initialPestTypeOptionId: string | null;
  readOnly?: boolean;
  /** Called after a successful save so parent UI can refresh treatment notes. */
  onPestTypeChange?: (pestTypeOptionId: string | null) => void;
};

export function PestTypeField({
  plantId,
  options,
  initialPestTypeOptionId,
  readOnly = false,
  onPestTypeChange,
}: PestTypeFieldProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialPestTypeOptionId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeOptions = options.filter((option) => option.active);
  const selectedOption =
    options.find((option) => option.id === (initialPestTypeOptionId ?? selectedId)) ?? null;

  useEffect(() => {
    setSelectedId(initialPestTypeOptionId ?? "");
  }, [initialPestTypeOptionId]);

  function onChange(nextId: string) {
    setSelectedId(nextId);
    setError(null);

    if (readOnly) return;

    startTransition(async () => {
      const result = await setPestTypeAction(plantId, nextId || null);

      if (!result.success) {
        setError(result.error);
        setSelectedId(initialPestTypeOptionId ?? "");
        return;
      }

      onPestTypeChange?.(result.pestTypeOptionId);
      router.refresh();
    });
  }

  if (readOnly) {
    if (!selectedOption) return null;

    return (
      <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
          Pest type
        </h2>
        <p className="mt-1 text-sm font-medium text-hilda-heading">{selectedOption.label}</p>
      </section>
    );
  }

  return (
    <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
      <label className={hildaLabelClassName}>
        Pest type
        <span className="font-normal text-hilda-text-muted"> (required before Outpatient)</span>
        <select
          className={`${hildaInputClassName} py-2.5`}
          value={selectedId}
          disabled={isPending || activeOptions.length === 0}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select pest type…</option>
          {activeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {activeOptions.length === 0 ? (
        <p className="mt-2 text-sm text-hilda-error-text">
          No pest types configured. An admin can add them in Settings.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-hilda-error-text">{error}</p> : null}
      {isPending ? <p className="mt-2 text-xs text-hilda-text-muted">Saving…</p> : null}
    </section>
  );
}
