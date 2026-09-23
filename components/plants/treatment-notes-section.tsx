"use client";

import { useCallback } from "react";
import { saveTreatmentNoteAction } from "@/app/actions/save-treatment-note";
import { PlantAutosaveTextarea } from "@/components/plants/plant-autosave-textarea";
import { DEFAULT_TREATMENT_NOTES_PLACEHOLDER } from "@/lib/care-tips/constants";
import { FIELD_HIGHLIGHT_CLASS } from "@/lib/ui/field-highlight";
import { cn } from "@/lib/utils";

type TreatmentNotesSectionProps = {
  plantId: string;
  treatmentNote: string | null;
  placeholder?: string;
  embedded?: boolean;
  compact?: boolean;
  readOnly?: boolean;
  highlighted?: boolean;
  onHighlightClear?: () => void;
};

export function TreatmentNotesSection({
  plantId,
  treatmentNote,
  placeholder = DEFAULT_TREATMENT_NOTES_PLACEHOLDER,
  embedded = false,
  compact = false,
  readOnly = false,
  highlighted = false,
  onHighlightClear,
}: TreatmentNotesSectionProps) {
  const handleSave = useCallback(
    async (content: string) => {
      const result = await saveTreatmentNoteAction(plantId, content);
      if (result.success && content.trim()) {
        onHighlightClear?.();
      }
      return result;
    },
    [onHighlightClear, plantId],
  );

  const body = (
    <PlantAutosaveTextarea
      ariaLabel="Treatment notes"
      placeholder={placeholder}
      initialValue={treatmentNote ?? ""}
      onSave={handleSave}
      readOnly={readOnly}
      highlighted={highlighted && embedded}
    />
  );

  if (embedded) {
    return body;
  }

  const sectionClass = compact
    ? "space-y-3 rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3"
    : "space-y-4 rounded-hilda border border-hilda-border/15 bg-hilda-surface p-5 shadow-sm";

  return (
    <section
      data-readiness-field="treatment_notes"
      className={cn(sectionClass, highlighted ? FIELD_HIGHLIGHT_CLASS : null)}
    >
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
          Treatment notes
        </h2>
        {!compact && !readOnly ? (
          <p className={cn("mt-1 text-sm text-hilda-text")}>
            Surgery and treatment details for this plant. Changes save automatically. Only the
            first 750 characters are sent in customer emails via Mailchimp.
          </p>
        ) : null}
      </div>
      {body}
    </section>
  );
}
