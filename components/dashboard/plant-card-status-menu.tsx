"use client";

import { useEffect, useState, useTransition } from "react";
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
  const [selectValue, setSelectValue] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectValue(currentStatus);
  }, [currentStatus]);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = event.target.value as PlantStatus;

    if (newStatus === currentStatus) return;

    setSelectValue(newStatus);
    setError(null);

    startTransition(async () => {
      const result = await updatePlantStatusAction(plantId, newStatus);

      if (!result.success) {
        setError(result.error);
        setSelectValue(currentStatus);
      }
    });
  }

  return (
    <div className={cn("block", className)} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <label className="block">
        <span className="sr-only">Move plant to another lane</span>
        <select
          className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[11px] font-medium text-zinc-800 disabled:opacity-50"
          value={selectValue}
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
      </label>
      {isPending ? (
        <span className="mt-0.5 block text-[10px] text-zinc-500">Updating…</span>
      ) : null}
      {error ? <p className="mt-0.5 text-[10px] text-red-600">{error}</p> : null}
    </div>
  );
}
