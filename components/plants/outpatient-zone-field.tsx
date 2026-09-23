"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setOutpatientZoneAction } from "@/app/actions/set-outpatient-zone";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import type { OutpatientZoneOption } from "@/lib/outpatient-zones/types";

type OutpatientZoneFieldProps = {
  plantId: string;
  options: OutpatientZoneOption[];
  initialOutpatientZoneId: string | null;
  readOnly?: boolean;
};

export function OutpatientZoneField({
  plantId,
  options,
  initialOutpatientZoneId,
  readOnly = false,
}: OutpatientZoneFieldProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialOutpatientZoneId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeOptions = options.filter((option) => option.active);
  const selectedOption =
    options.find((option) => option.id === (initialOutpatientZoneId ?? selectedId)) ?? null;

  useEffect(() => {
    setSelectedId(initialOutpatientZoneId ?? "");
  }, [initialOutpatientZoneId]);

  function onChange(nextId: string) {
    if (!nextId) {
      setError("Select an outpatient zone.");
      return;
    }

    setSelectedId(nextId);
    setError(null);

    if (readOnly) return;

    startTransition(async () => {
      const result = await setOutpatientZoneAction(plantId, nextId);

      if (!result.success) {
        setError(result.error);
        setSelectedId(initialOutpatientZoneId ?? "");
        return;
      }

      router.refresh();
    });
  }

  if (readOnly) {
    if (!selectedOption) return null;

    return (
      <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
          Outpatient zone
        </h2>
        <p className="mt-1 text-sm font-medium text-hilda-heading">{selectedOption.label}</p>
      </section>
    );
  }

  return (
    <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
      <label className={hildaLabelClassName}>
        Outpatient zone
        <select
          className={`${hildaInputClassName} py-2.5`}
          value={selectedId}
          disabled={isPending || activeOptions.length === 0}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select zone…</option>
          {activeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {activeOptions.length === 0 ? (
        <p className="mt-2 text-sm text-hilda-error-text">
          No outpatient zones configured. An admin can add them in Settings.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-hilda-error-text">{error}</p> : null}
      {isPending ? <p className="mt-2 text-xs text-hilda-text-muted">Saving…</p> : null}
    </section>
  );
}
