"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createOutpatientZoneOptionAction,
  deleteOutpatientZoneOptionAction,
  updateOutpatientZoneOptionAction,
} from "@/app/actions/outpatient-zone-settings";
import { Button } from "@/components/ui/button";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import type { OutpatientZoneOption } from "@/lib/outpatient-zones/types";

type OutpatientZoneOptionsSettingsFormProps = {
  options: OutpatientZoneOption[];
};

function labelsFromOptions(options: OutpatientZoneOption[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const option of options) {
    initial[option.id] = option.label;
  }
  return initial;
}

export function OutpatientZoneOptionsSettingsForm({
  options,
}: OutpatientZoneOptionsSettingsFormProps) {
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
      const result = await createOutpatientZoneOptionAction({ label });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      setNewLabel("");
      refreshAfter("Zone option added.");
    });
  }

  function handleUpdate(id: string) {
    const label = (draftLabels[id] ?? "").trim();
    if (!label) {
      setError("Option label cannot be empty.");
      return;
    }

    startTransition(async () => {
      const result = await updateOutpatientZoneOptionAction({ id, label });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      refreshAfter("Zone option updated.");
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await deleteOutpatientZoneOptionAction({ id });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      refreshAfter("Zone option removed from the list.");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-hilda-heading">Outpatient zones</h2>
        <p className="mt-1 text-sm text-hilda-text">
          Zones staff must choose when moving a plant to Outpatient (e.g. Office, Quarantine).
          Removing an option hides it from new moves; past plants keep the zone they recorded.
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
              <span className="sr-only">Edit zone option</span>
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
          placeholder="Add outpatient zone…"
          value={newLabel}
          onChange={(event) => {
            setNewLabel(event.target.value);
            setMessage(null);
          }}
          aria-label="New outpatient zone option"
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
