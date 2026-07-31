"use client";

import { useCallback } from "react";
import { saveTreatmentNoteAction } from "@/app/actions/save-treatment-note";
import { PlantAutosaveTextarea } from "@/components/plants/plant-autosave-textarea";
import { DEFAULT_TREATMENT_NOTES_PLACEHOLDER } from "@/lib/care-tips/constants";
import { TREATMENT_NOTES_MAX_CHARS } from "@/lib/mailchimp/chunk-treatment-notes";
import { cn } from "@/lib/utils";

type TreatmentNotesSectionProps = {
  plantId: string;
  treatmentNote: string | null;
  placeholder?: string;
  embedded?: boolean;
  compact?: boolean;
};

export function TreatmentNotesSection({
  plantId,
  treatmentNote,
  placeholder = DEFAULT_TREATMENT_NOTES_PLACEHOLDER,
  embedded = false,
  compact = false,
}: TreatmentNotesSectionProps) {
  const handleSave = useCallback(
    (content: string) => saveTreatmentNoteAction(plantId, content),
    [plantId],
  );

  const body = (
    <PlantAutosaveTextarea
      ariaLabel="Treatment notes"
      placeholder={placeholder}
      initialValue={treatmentNote ?? ""}
      onSave={handleSave}
      maxLength={TREATMENT_NOTES_MAX_CHARS}
      showCount
    />
  );

  if (embedded) {
    return body;
  }

  const sectionClass = compact
    ? "space-y-3 rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3"
    : "space-y-4 rounded-hilda border border-hilda-border/15 bg-hilda-surface p-5 shadow-sm";

  return (
    <section className={sectionClass}>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
          Treatment notes
        </h2>
        {!compact ? (
          <p className={cn("mt-1 text-sm text-hilda-text")}>
            Surgery and treatment details for this plant. Changes save automatically. Max{" "}
            {TREATMENT_NOTES_MAX_CHARS} characters (for customer emails via Mailchimp).
          </p>
        ) : null}
      </div>
      {body}
    </section>
  );
}
