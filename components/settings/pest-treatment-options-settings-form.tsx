"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createPestTreatmentOptionAction,
  deletePestTreatmentOptionAction,
  updatePestTreatmentOptionAction,
} from "@/app/actions/pest-treatment-settings";
import { Button } from "@/components/ui/button";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import type { PestTreatmentOption } from "@/lib/pest-treatments/types";

type PestTreatmentOptionsSettingsFormProps = {
  options: PestTreatmentOption[];
};

function labelsFromOptions(options: PestTreatmentOption[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const option of options) {
    initial[option.id] = option.label;
  }
  return initial;
}

export function PestTreatmentOptionsSettingsForm({
  options,
}: PestTreatmentOptionsSettingsFormProps) {
  const router = useRouter();
  const [draftLabels, setDraftLabels] = useState(() => labelsFromOptions(options));
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraftLabels(labelsFromOptions(options));
  }, [options]);

  const activeOptions = options.filter((option) => option.active);
  const inactiveOptions = options.filter((option) => !option.active);

  function refreshAfter(successMessage: string) {
    setMessage(successMessage);
    setError(null);
    router.refresh();
  }

  function handleAdd() {
    const label = newLabel.trim();
    if (!label) {
      setError("Enter a label before adding an option.");
      return;
    }

    startTransition(async () => {
      const result = await createPestTreatmentOptionAction({ label });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      setNewLabel("");
      refreshAfter("Treatment option added.");
    });
  }

  function handleUpdate(id: string) {
    const label = (draftLabels[id] ?? "").trim();
    if (!label) {
      setError("Option label cannot be empty.");
      return;
    }

    startTransition(async () => {
      const result = await updatePestTreatmentOptionAction({ id, label });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      refreshAfter("Treatment option updated.");
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await deletePestTreatmentOptionAction({ id });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      refreshAfter("Treatment option removed from the list.");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-hilda-heading">Pest treatment options</h2>
        <p className="mt-1 text-sm text-hilda-text">
          Options shown when staff record Treatment 1 / 2 / 3 on a plant. Removing an option hides
          it from new recordings; past plants keep the label they recorded.
        </p>
      </div>

      {error ? (
        <p className="rounded-hilda border border-hilda-error-border bg-hilda-error-bg px-3 py-2 text-sm text-hilda-error-text-strong">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-hilda-text-muted" aria-live="polite">
          {message}
        </p>
      ) : null}

      <ul className="space-y-2">
        {activeOptions.map((option) => (
          <li
            key={option.id}
            className="flex flex-col gap-2 rounded-hilda-sm border border-hilda-border/15 bg-hilda-bg p-3 sm:flex-row sm:items-center"
          >
            <label className={`${hildaLabelClassName} mt-0 min-w-0 flex-1`}>
              <span className="sr-only">Edit treatment option</span>
              <input
                className={`${hildaInputClassName} mt-0 w-full`}
                value={draftLabels[option.id] ?? option.label}
                onChange={(event) => {
                  setDraftLabels((current) => ({
                    ...current,
                    [option.id]: event.target.value,
                  }));
                  setMessage(null);
                }}
              />
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleUpdate(option.id)}
              >
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleRemove(option.id)}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className={`${hildaInputClassName} w-full flex-1`}
          placeholder="Add treatment option…"
          value={newLabel}
          onChange={(event) => {
            setNewLabel(event.target.value);
            setMessage(null);
          }}
          aria-label="New pest treatment option"
        />
        <Button type="button" disabled={isPending} onClick={handleAdd}>
          Add
        </Button>
      </div>

      {inactiveOptions.length > 0 ? (
        <p className="text-xs text-hilda-text-muted">
          Removed options ({inactiveOptions.length}):{" "}
          {inactiveOptions.map((option) => option.label).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
