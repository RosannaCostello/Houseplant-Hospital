"use client";

import { useCallback } from "react";
import { saveCareTipAction } from "@/app/actions/save-care-tip";
import { PlantAutosaveTextarea } from "@/components/plants/plant-autosave-textarea";
import { cn } from "@/lib/utils";

type CareTipsSectionProps = {
  plantId: string;
  careTip: string | null;
  embedded?: boolean;
  compact?: boolean;
};

export function CareTipsSection({
  plantId,
  careTip,
  embedded = false,
  compact = false,
}: CareTipsSectionProps) {
  const handleSave = useCallback(
    (content: string) => saveCareTipAction(plantId, content),
    [plantId],
  );

  const body = (
    <PlantAutosaveTextarea
      ariaLabel="Care tips"
      placeholder="Water lightly twice a week, keep away from direct sun…"
      initialValue={careTip ?? ""}
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
        <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">Care tips</h2>
        {!compact ? (
          <p className={cn("mt-1 text-sm text-hilda-text")}>
            Advice for the customer when they collect their plant. Changes save automatically.
          </p>
        ) : null}
      </div>
      {body}
    </section>
  );
}
