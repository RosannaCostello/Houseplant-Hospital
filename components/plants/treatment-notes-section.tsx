"use client";

import { useCallback } from "react";
import { saveTreatmentNoteAction } from "@/app/actions/save-treatment-note";
import { PlantAutosaveTextarea } from "@/components/plants/plant-autosave-textarea";
import { cn } from "@/lib/utils";

type TreatmentNotesSectionProps = {
  plantId: string;
  treatmentNote: string | null;
  embedded?: boolean;
  compact?: boolean;
};

export function TreatmentNotesSection({
  plantId,
  treatmentNote,
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
      placeholder="What treatment was done?"
      initialValue={treatmentNote ?? ""}
      onSave={handleSave}
    />
  );

  if (embedded) {
    return body;
  }

  const sectionClass = compact
    ? "space-y-3 rounded-none border border-hilda-border/15 bg-hilda-surface p-3"
    : "space-y-4 rounded-none border border-hilda-border/15 bg-hilda-surface p-5 shadow-sm";

  return (
    <section className={sectionClass}>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">Treatment notes</h2>
        {!compact ? (
          <p className={cn("mt-1 text-sm text-hilda-text")}>
            Surgery and treatment details for this plant. Changes save automatically.
          </p>
        ) : null}
      </div>
      {body}
    </section>
  );
}
