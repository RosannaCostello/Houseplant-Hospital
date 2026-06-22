import type { PlantStatus } from "@/lib/plant-status";

const BLOCKING_VISIT_STATUSES = new Set<PlantStatus>(["check_in", "in_surgery", "quarantine"]);

type VisitPlantStatus = {
  id: string;
  status: PlantStatus;
};

export function formatOutpatientCollectionBadge(
  plantId: string,
  plantStatus: PlantStatus,
  visitPlants: VisitPlantStatus[],
): string | null {
  if (plantStatus !== "outpatient") return null;

  if (visitPlants.length <= 1) {
    return "Ready to collect";
  }

  const blockingCount = visitPlants.filter(
    (plant) => plant.id !== plantId && BLOCKING_VISIT_STATUSES.has(plant.status),
  ).length;

  if (blockingCount > 0) {
    return blockingCount === 1
      ? "Awaiting 1 other plant"
      : `Awaiting ${blockingCount} other plants`;
  }

  return "Ready to collect";
}

export function buildVisitPlantsByVisitId<T extends { id: string; visit_id: string; status: string }>(
  rows: T[],
  isPlantStatus: (value: string) => value is PlantStatus,
): Map<string, VisitPlantStatus[]> {
  const byVisit = new Map<string, VisitPlantStatus[]>();

  for (const row of rows) {
    if (!isPlantStatus(row.status)) continue;

    const list = byVisit.get(row.visit_id) ?? [];
    list.push({ id: row.id, status: row.status });
    byVisit.set(row.visit_id, list);
  }

  return byVisit;
}
