"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { recordPestTreatmentAction } from "@/app/actions/set-pest-treatment";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import type { PestTreatmentOption } from "@/lib/pest-treatments/types";
import {
  nextPestTreatmentNumber,
  type PestTreatmentNumber,
  type PlantPestTreatment,
} from "@/lib/plants/pest-treatments";

type PestTreatmentsSectionProps = {
  plantId: string;
  treatments: PlantPestTreatment[];
  options: PestTreatmentOption[];
  disabled?: boolean;
};

function treatmentLabel(number: PestTreatmentNumber): string {
  return `Treatment ${number}`;
}

function formatTreatedAt(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Numbers to show as empty pickers: missing slots among 1..3, else next beyond 3. */
function openTreatmentSlots(treatments: PlantPestTreatment[]): PestTreatmentNumber[] {
  const recorded = new Set(treatments.map((row) => row.treatmentNumber));
  const missingBase = ([1, 2, 3] as const).filter((n) => !recorded.has(n));
  if (missingBase.length > 0) {
    return [...missingBase];
  }
  return [nextPestTreatmentNumber(treatments)];
}

export function PestTreatmentsSection({
  plantId,
  treatments: initialTreatments,
  options,
  disabled = false,
}: PestTreatmentsSectionProps) {
  const router = useRouter();
  const [treatments, setTreatments] = useState(initialTreatments);
  const [draftOptionIds, setDraftOptionIds] = useState<Partial<Record<number, string>>>({});
  const [addingExtra, setAddingExtra] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    treatmentNumber: PestTreatmentNumber;
    optionId: string;
    optionLabel: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTreatments(initialTreatments);
    setAddingExtra(false);
  }, [initialTreatments]);

  const optionsById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);

  const sortedTreatments = useMemo(
    () => [...treatments].sort((a, b) => a.treatmentNumber - b.treatmentNumber),
    [treatments],
  );

  const openSlots = useMemo(() => openTreatmentSlots(treatments), [treatments]);
  const canAddAnother = treatments.length >= 3 && !addingExtra;
  const visibleOpenSlots =
    treatments.length >= 3 && !addingExtra ? [] : openSlots.filter((n) => n <= 3 || addingExtra);

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
      if (pendingConfirm.treatmentNumber > 3) {
        setAddingExtra(false);
      }
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
        if (treatmentNumber > 3) {
          setAddingExtra(false);
        }
        setError(result.error);
        return;
      }

      setTreatments(result.treatments);
      clearDraft(treatmentNumber);
      setAddingExtra(false);
      router.refresh();
    });
  }

  function startAddAnother() {
    setError(null);
    setAddingExtra(true);
  }

  return (
    <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
      <h2 className="text-sm font-medium text-hilda-heading">Pest treatments</h2>
      <p className="mt-1 text-xs text-hilda-text-muted">
        Pick a treatment type to record it (you’ll confirm first). Once recorded, a treatment cannot
        be changed. At least three are required before Outpatient when pests were ever found; you
        can add more after that if needed.
      </p>

      <ul className="mt-3 space-y-3">
        {sortedTreatments.map((recorded) => (
          <li
            key={recorded.treatmentNumber}
            className="rounded-hilda-sm border border-hilda-border/10 px-3 py-2.5"
          >
            <p className="text-sm font-medium text-hilda-heading">
              {treatmentLabel(recorded.treatmentNumber)}
            </p>
            <div className="mt-1.5">
              <p className="text-sm text-hilda-text">{recorded.optionLabel}</p>
              <p className="mt-0.5 text-xs text-hilda-text-muted">
                Recorded {formatTreatedAt(recorded.treatedAt)} · Locked
              </p>
            </div>
          </li>
        ))}

        {visibleOpenSlots.map((number) => {
          const draftId = draftOptionIds[number] ?? "";

          return (
            <li
              key={`open-${number}`}
              className="rounded-hilda-sm border border-hilda-border/10 px-3 py-2.5"
            >
              <p className="text-sm font-medium text-hilda-heading">{treatmentLabel(number)}</p>
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
            </li>
          );
        })}
      </ul>

      {canAddAnother && !disabled ? (
        <button
          type="button"
          className="mt-3 text-sm font-medium text-hilda-heading underline-offset-2 hover:underline disabled:opacity-50"
          disabled={isPending || options.length === 0}
          onClick={startAddAnother}
        >
          Add another treatment
        </button>
      ) : null}

      {options.length === 0 && !disabled ? (
        <p className="mt-2 text-sm text-hilda-error-text">
          No treatment options configured. An admin can add them in Settings.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-hilda-error-text">{error}</p> : null}
      {isPending ? <p className="mt-2 text-sm text-hilda-text-muted">Saving…</p> : null}

      <ConfirmDialog
        open={pendingConfirm != null}
        title={`Record ${pendingConfirm ? treatmentLabel(pendingConfirm.treatmentNumber) : "treatment"}?`}
        message={
          pendingConfirm
            ? `Record “${pendingConfirm.optionLabel}” for ${treatmentLabel(pendingConfirm.treatmentNumber)}? This cannot be undone.`
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
