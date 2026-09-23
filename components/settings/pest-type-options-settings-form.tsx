"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createPestTypeOptionAction,
  deletePestTypeOptionAction,
  updatePestTypeOptionAction,
} from "@/app/actions/pest-type-settings";
import { Button } from "@/components/ui/button";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import type { PestTypeOption } from "@/lib/pest-types/types";

type PestTypeOptionsSettingsFormProps = {
  options: PestTypeOption[];
};

type DraftFields = {
  label: string;
  paragraph: string;
};

function draftsFromOptions(options: PestTypeOption[]): Record<string, DraftFields> {
  const initial: Record<string, DraftFields> = {};
  for (const option of options) {
    initial[option.id] = { label: option.label, paragraph: option.paragraph };
  }
  return initial;
}

export function PestTypeOptionsSettingsForm({ options }: PestTypeOptionsSettingsFormProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(() => draftsFromOptions(options));
  const [newLabel, setNewLabel] = useState("");
  const [newParagraph, setNewParagraph] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDrafts(draftsFromOptions(options));
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
      const result = await createPestTypeOptionAction({
        label,
        paragraph: newParagraph,
      });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      setNewLabel("");
      setNewParagraph("");
      refreshAfter("Pest type added.");
    });
  }

  function handleUpdate(id: string) {
    const draft = drafts[id];
    const label = (draft?.label ?? "").trim();
    if (!label) {
      setError("Option label cannot be empty.");
      return;
    }

    startTransition(async () => {
      const result = await updatePestTypeOptionAction({
        id,
        label,
        paragraph: draft?.paragraph ?? "",
      });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      refreshAfter("Pest type updated.");
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await deletePestTypeOptionAction({ id });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      refreshAfter("Pest type removed from the list.");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-hilda-heading">Pest types</h2>
        <p className="mt-1 text-sm text-hilda-text">
          Pest types staff can select at check-in or on Update plant. The paragraph fills treatment
          notes when notes are still blank. Removing an option hides it from new selections; past
          plants keep the type they recorded.
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

      <ul className="space-y-3">
        {activeOptions.map((option) => {
          const draft = drafts[option.id] ?? {
            label: option.label,
            paragraph: option.paragraph,
          };
          return (
            <li
              key={option.id}
              className="space-y-2 rounded-hilda-sm border border-hilda-border/15 bg-hilda-bg p-3"
            >
              <label className={`${hildaLabelClassName} mt-0`}>
                <span className="sr-only">Edit pest type label</span>
                <input
                  className={`${hildaInputClassName} mt-0 w-full`}
                  value={draft.label}
                  onChange={(event) => {
                    setDrafts((current) => ({
                      ...current,
                      [option.id]: { ...draft, label: event.target.value },
                    }));
                    setMessage(null);
                  }}
                />
              </label>
              <label className={`${hildaLabelClassName} mt-0`}>
                <span className="text-xs font-normal text-hilda-text-muted">Treatment notes paragraph</span>
                <textarea
                  className={`${hildaInputClassName} mt-1 min-h-20 w-full`}
                  value={draft.paragraph}
                  onChange={(event) => {
                    setDrafts((current) => ({
                      ...current,
                      [option.id]: { ...draft, paragraph: event.target.value },
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
          );
        })}
      </ul>

      <div className="space-y-2 rounded-hilda-sm border border-dashed border-hilda-border/25 bg-hilda-bg p-3">
        <input
          className={`${hildaInputClassName} mt-0 w-full`}
          placeholder="Add pest type label…"
          value={newLabel}
          onChange={(event) => {
            setNewLabel(event.target.value);
            setMessage(null);
          }}
          aria-label="New pest type label"
        />
        <textarea
          className={`${hildaInputClassName} mt-0 min-h-20 w-full`}
          placeholder="Treatment notes paragraph (optional)…"
          value={newParagraph}
          onChange={(event) => {
            setNewParagraph(event.target.value);
            setMessage(null);
          }}
          aria-label="New pest type paragraph"
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
