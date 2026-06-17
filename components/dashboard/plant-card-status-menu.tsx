"use client";

import { useTransition } from "react";
import { updatePlantStatusAction } from "@/app/actions/update-plant-status";
import {
  PLANT_STATUS_LANES,
  type PlantStatus,
} from "@/lib/plant-status";
import { cn } from "@/lib/utils";

type PlantCardStatusMenuProps = {
  plantId: string;
  currentStatus: PlantStatus;
  className?: string;
};

export function PlantCardStatusMenu({
  plantId,
  currentStatus,
  className,
}: PlantCardStatusMenuProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = event.target.value as PlantStatus;

    if (newStatus === currentStatus) return;

    startTransition(async () => {
      const result = await updatePlantStatusAction(plantId, newStatus);

      if (!result.success) {
        window.alert(result.error);
        event.target.value = currentStatus;
      }
    });
  }

  return (
    <label
      className={cn("block", className)}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="sr-only">Move plant to another lane</span>
      <select
        className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[11px] font-medium text-zinc-800 disabled:opacity-50"
        value={currentStatus}
        disabled={isPending}
        onChange={handleChange}
        aria-label="Move to lane"
      >
        {PLANT_STATUS_LANES.map((lane) => (
          <option key={lane.status} value={lane.status}>
            {lane.status === currentStatus ? `In ${lane.label}` : `Move to ${lane.label}`}
          </option>
        ))}
      </select>
      {isPending ? (
        <span className="mt-0.5 block text-[10px] text-zinc-500">Updating…</span>
      ) : null}
    </label>
  );
}
