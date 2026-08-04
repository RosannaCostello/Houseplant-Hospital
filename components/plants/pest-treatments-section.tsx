"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { recordPestTreatmentAction } from "@/app/actions/set-pest-treatment";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import type { PestTreatmentOption } from "@/lib/pest-treatments/types";
import type { PestTreatmentNumber, PlantPestTreatment } from "@/lib/plants/pest-treatments";

const TREATMENT_LABELS: Record<PestTreatmentNumber, string> = {
  1: "Treatment 1",
  2: "Treatment 2",
  3: "Treatment 3",
};

type PestTreatmentsSectionProps = {
  plantId: string;
  treatments: PlantPestTreatment[];
  options: PestTreatmentOption[];
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
  options,
  disabled = false,
}: PestTreatmentsSectionProps) {
  const router = useRouter();
  const [treatments, setTreatments] = useState(initialTreatments);
  const [draftOptionIds, setDraftOptionIds] = useState<Partial<Record<PestTreatmentNumber, string>>>(
    {},
  );
  const [pendingConfirm, setPendingConfirm] = useState<{
    treatmentNumber: PestTreatmentNumber;
    optionId: string;
    optionLabel: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTreatments(initialTreatments);
  }, [initialTreatments]);

  const optionsById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);

  function treatmentFor(number: PestTreatmentNumber): PlantPestTreatment | undefined {
    return treatments.find((row) => row.treatmentNumber === number);
  }

  function clearDraft(treatmentNumber: PestTreatmentNumber) {
    setDraftOptionIds((current) => {
      const next = { ...current };
      delete next[treatmentNumber];
      return next;
    });
  }

  function onSelectOption(treatmentNumber: PestTreatmentNumber, optionId: string) {
    if (!optionId) {
      clearDraft(treatmentNumber);
      setPendingConfirm(null);
      return;
    }

    const option = optionsById.get(optionId);
    if (!option) {
      clearDraft(treatmentNumber);
      setError("Choose a valid treatment option.");
      return;
    }

    setError(null);
    setDraftOptionIds((current) => ({
      ...current,
      [treatmentNumber]: optionId,
    }));
    setPendingConfirm({
      treatmentNumber,
      optionId,
      optionLabel: option.label,
    });
  }

  function cancelConfirm() {
    if (pendingConfirm) {
      clearDraft(pendingConfirm.treatmentNumber);
    }
    setPendingConfirm(null);
  }

  function confirmRecord() {
    if (!pendingConfirm) return;

    const { treatmentNumber, optionId } = pendingConfirm;
    setPendingConfirm(null);

    startTransition(async () => {
      const result = await recordPestTreatmentAction(plantId, treatmentNumber, optionId);

      if (!result.success) {
        clearDraft(treatmentNumber);
        setError(result.error);
        return;
      }

      setTreatments(result.treatments);
      clearDraft(treatmentNumber);
      router.refresh();
    });
  }

  return (
    <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
      <h2 className="text-sm font-medium text-hilda-heading">Pest treatments</h2>
      <p className="mt-1 text-xs text-hilda-text-muted">
        Pick a treatment type to record it (you’ll confirm first). Once recorded, a treatment cannot
        be changed. All three are required before Outpatient when pests were ever found.
      </p>

      <ul className="mt-3 space-y-3">
        {([1, 2, 3] as const).map((number) => {
          const recorded = treatmentFor(number);
          const draftId = draftOptionIds[number] ?? "";

          return (
            <li
              key={number}
              className="rounded-hilda-sm border border-hilda-border/10 px-3 py-2.5"
            >
              <p className="text-sm font-medium text-hilda-heading">{TREATMENT_LABELS[number]}</p>

              {recorded ? (
                <div className="mt-1.5">
                  <p className="text-sm text-hilda-text">{recorded.optionLabel}</p>
                  <p className="mt-0.5 text-xs text-hilda-text-muted">
                    Recorded {formatTreatedAt(recorded.treatedAt)} · Locked
                  </p>
                </div>
              ) : (
                <label className={`${hildaLabelClassName} mt-2 block`}>
                  Treatment type
                  <select
                    className={`${hildaInputClassName} py-2.5`}
                    value={draftId}
                    disabled={disabled || isPending || options.length === 0}
                    onChange={(event) => onSelectOption(number, event.target.value)}
                  >
                    <option value="">Select treatment…</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          );
        })}
      </ul>

      {options.length === 0 && !disabled ? (
        <p className="mt-2 text-sm text-hilda-error-text">
          No treatment options configured. An admin can add them in Settings.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-hilda-error-text">{error}</p> : null}
      {isPending ? <p className="mt-2 text-sm text-hilda-text-muted">Saving…</p> : null}

      <ConfirmDialog
        open={pendingConfirm != null}
        title={`Record ${pendingConfirm ? TREATMENT_LABELS[pendingConfirm.treatmentNumber] : "treatment"}?`}
        message={
          pendingConfirm
            ? `Record “${pendingConfirm.optionLabel}” for ${TREATMENT_LABELS[pendingConfirm.treatmentNumber]}? This cannot be undone.`
            : ""
        }
        confirmLabel="Record treatment"
        cancelLabel="Cancel"
        pending={isPending}
        onConfirm={confirmRecord}
        onCancel={cancelConfirm}
      />
    </section>
  );
}
