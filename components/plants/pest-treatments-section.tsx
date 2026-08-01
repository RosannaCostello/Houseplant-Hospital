"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setPestTreatmentAction } from "@/app/actions/set-pest-treatment";
import type { PestTreatmentNumber, PlantPestTreatment } from "@/lib/plants/pest-treatments";

const TREATMENT_LABELS: Record<PestTreatmentNumber, string> = {
  1: "Treatment 1",
  2: "Treatment 2",
  3: "Treatment 3",
};

type PestTreatmentsSectionProps = {
  plantId: string;
  treatments: PlantPestTreatment[];
  disabled?: boolean;
};

function formatTreatedAt(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PestTreatmentsSection({
  plantId,
  treatments: initialTreatments,
  disabled = false,
}: PestTreatmentsSectionProps) {
  const router = useRouter();
  const [treatments, setTreatments] = useState(initialTreatments);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTreatments(initialTreatments);
  }, [initialTreatments]);

  function treatedAtFor(number: PestTreatmentNumber): string | null {
    return treatments.find((row) => row.treatmentNumber === number)?.treatedAt ?? null;
  }

  function handleToggle(treatmentNumber: PestTreatmentNumber, completed: boolean) {
    setError(null);

    startTransition(async () => {
      const result = await setPestTreatmentAction(plantId, treatmentNumber, completed);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setTreatments(result.treatments);
      router.refresh();
    });
  }

  return (
    <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
      <h2 className="text-sm font-medium text-hilda-heading">Pest treatments</h2>
      <p className="mt-1 text-xs text-hilda-text-muted">
        Record each treatment. All three are required before Outpatient when pests were ever found.
      </p>

      <ul className="mt-3 space-y-2">
        {([1, 2, 3] as const).map((number) => {
          const treatedAt = treatedAtFor(number);
          const checked = treatedAt != null;

          return (
            <li
              key={number}
              className="flex items-start gap-3 rounded-hilda-sm border border-hilda-border/10 px-3 py-2"
            >
              <input
                id={`pest-treatment-${plantId}-${number}`}
                type="checkbox"
                className="mt-1 h-4 w-4 accent-hilda-heading"
                checked={checked}
                disabled={disabled || isPending}
                onChange={(event) => handleToggle(number, event.target.checked)}
              />
              <label
                htmlFor={`pest-treatment-${plantId}-${number}`}
                className="min-w-0 flex-1 text-sm text-hilda-text"
              >
                <span className="font-medium text-hilda-heading">{TREATMENT_LABELS[number]}</span>
                {treatedAt ? (
                  <span className="mt-0.5 block text-xs text-hilda-text-muted">
                    {formatTreatedAt(treatedAt)}
                  </span>
                ) : (
                  <span className="mt-0.5 block text-xs text-hilda-text-muted">Not recorded</span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      {error ? <p className="mt-2 text-sm text-hilda-error-text">{error}</p> : null}
      {isPending ? <p className="mt-2 text-sm text-hilda-text-muted">Saving…</p> : null}
    </section>
  );
}
