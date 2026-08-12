"use client";

import { useCallback } from "react";
import { saveInternalNotesAction } from "@/app/actions/save-internal-notes";
import { PlantAutosaveTextarea } from "@/components/plants/plant-autosave-textarea";

type InternalNotesSectionProps = {
  plantId: string;
  internalNotes: string | null;
  readOnly?: boolean;
};

export function InternalNotesSection({
  plantId,
  internalNotes,
  readOnly = false,
}: InternalNotesSectionProps) {
  const handleSave = useCallback(
    (content: string) => saveInternalNotesAction(plantId, content),
    [plantId],
  );

  return (
    <section className="space-y-3 rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
        Internal notes
      </h2>
      <PlantAutosaveTextarea
        ariaLabel="Internal notes"
        placeholder="Staff notes for this plant (not sent to the customer)."
        initialValue={internalNotes ?? ""}
        onSave={handleSave}
        readOnly={readOnly}
        rows={3}
        minHeightClassName="min-h-[4.5rem]"
      />
    </section>
  );
}
