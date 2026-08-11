import type { PlantStatus } from "@/lib/plant-status";

/**
 * Sibling statuses that mean this drop-off already had a plant enter Surgery
 * (or move past it). Used to fire `plant_in_surgery` only once per visit.
 */
export const SURGERY_ALREADY_REACHED_STATUSES = new Set<PlantStatus>([
  "in_surgery",
  "outpatient",
  "collected",
  "dead",
]);

type VisitPlantStatus = {
  id: string;
  status: PlantStatus;
};

/**
 * True when this plant is the first on the visit to enter In Surgery.
 * Call after the plant row is already updated to `in_surgery` — excludes self.
 */
export function shouldEmitPlantInSurgeryEvent(
  plantId: string,
  visitPlants: VisitPlantStatus[],
): boolean {
  return !visitPlants.some(
    (plant) => plant.id !== plantId && SURGERY_ALREADY_REACHED_STATUSES.has(plant.status),
  );
}
