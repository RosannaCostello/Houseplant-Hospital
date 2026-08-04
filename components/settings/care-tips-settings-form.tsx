"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createCareTipOptionAction,
  deleteCareTipOptionAction,
  updateCareTipOptionAction,
  updateTreatmentNotesPlaceholderAction,
} from "@/app/actions/care-tip-settings";
import { Button } from "@/components/ui/button";
import {
  CARE_TIP_CATEGORIES,
  CARE_TIP_CATEGORY_LABELS,
  type CareTipCategory,
} from "@/lib/care-tips/compose-parse";
import type { CareTipOptionsByCategory } from "@/lib/care-tips/types";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";

type CareTipsSettingsFormProps = {
  optionsByCategory: CareTipOptionsByCategory;
  treatmentNotesPlaceholder: string;
};

function labelsFromOptions(optionsByCategory: CareTipOptionsByCategory): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const category of CARE_TIP_CATEGORIES) {
    for (const option of optionsByCategory[category]) {
      initial[option.id] = option.label;
    }
  }
  return initial;
}

export function CareTipsSettingsForm({
  optionsByCategory,
  treatmentNotesPlaceholder,
}: CareTipsSettingsFormProps) {
  const router = useRouter();
  const [placeholder, setPlaceholder] = useState(treatmentNotesPlaceholder);
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>(() =>
    labelsFromOptions(optionsByCategory),
  );
  const [newLabels, setNewLabels] = useState<Record<CareTipCategory, string>>({
    water: "",
    leaves: "",
    light: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraftLabels(labelsFromOptions(optionsByCategory));
    setPlaceholder(treatmentNotesPlaceholder);
  }, [optionsByCategory, treatmentNotesPlaceholder]);

  function refreshAfter(successMessage: string) {
    setMessage(successMessage);
    setError(null);
    router.refresh();
  }

  function handleSavePlaceholder(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateTreatmentNotesPlaceholderAction({ placeholder });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      refreshAfter("Treatment notes placeholder saved.");
    });
  }

  function handleAdd(category: CareTipCategory) {
    const label = newLabels[category].trim();
    if (!label) {
      setError("Enter a label before adding an option.");
      return;
    }

    startTransition(async () => {
      const result = await createCareTipOptionAction({ category, label });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      setNewLabels((current) => ({ ...current, [category]: "" }));
      refreshAfter(`Added ${CARE_TIP_CATEGORY_LABELS[category]} option.`);
    });
  }

  function handleUpdate(id: string) {
    const label = (draftLabels[id] ?? "").trim();
    if (!label) {
      setError("Option label cannot be empty.");
      return;
    }

    startTransition(async () => {
      const result = await updateCareTipOptionAction({ id, label });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      refreshAfter("Option updated.");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCareTipOptionAction({ id });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      refreshAfter("Option deleted.");
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-hilda-heading">Care tips & treatment copy</h2>
        <p className="mt-1 text-sm text-hilda-text">
          Manage the Water, Leaves, and Light options shown on plant detail, and the treatment
          notes placeholder.
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

      <form onSubmit={handleSavePlaceholder} className="space-y-3">
        <label className={hildaLabelClassName}>
          Treatment notes placeholder
          <textarea
            className={`${hildaInputClassName} min-h-[5rem] w-full resize-y py-2.5`}
            value={placeholder}
            onChange={(event) => {
              setPlaceholder(event.target.value);
              setMessage(null);
            }}
            rows={3}
          />
        </label>
        <Button type="submit" disabled={isPending}>
          Save placeholder
        </Button>
      </form>

      <div className="space-y-6">
        {CARE_TIP_CATEGORIES.map((category) => (
          <section key={category} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-hilda-text-muted">
              {CARE_TIP_CATEGORY_LABELS[category]} options
            </h3>

            <ul className="space-y-2">
              {optionsByCategory[category].map((option) => (
                <li
                  key={option.id}
                  className="flex flex-col gap-2 rounded-hilda-sm border border-hilda-border/15 bg-hilda-bg p-3 sm:flex-row sm:items-center"
                >
                  <input
                    className={`${hildaInputClassName} w-full flex-1`}
                    value={draftLabels[option.id] ?? option.label}
                    onChange={(event) => {
                      setDraftLabels((current) => ({
                        ...current,
                        [option.id]: event.target.value,
                      }));
                      setMessage(null);
                    }}
                    aria-label={`Edit ${CARE_TIP_CATEGORY_LABELS[category]} option`}
                  />
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
                      onClick={() => handleDelete(option.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className={`${hildaInputClassName} w-full flex-1`}
                placeholder={`Add ${CARE_TIP_CATEGORY_LABELS[category].toLowerCase()} option…`}
                value={newLabels[category]}
                onChange={(event) => {
                  setNewLabels((current) => ({
                    ...current,
                    [category]: event.target.value,
                  }));
                  setMessage(null);
                }}
                aria-label={`New ${CARE_TIP_CATEGORY_LABELS[category]} option`}
              />
              <Button
                type="button"
                disabled={isPending}
                onClick={() => handleAdd(category)}
              >
                Add
              </Button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
