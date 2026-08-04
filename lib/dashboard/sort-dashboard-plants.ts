import type { DashboardPlant } from "@/lib/dashboard/types";

export type DashboardLaneSortOrder = "newest" | "oldest";

function sortTimestamp(plant: DashboardPlant): number {
  // Collected lane: sort by when the plant was collected, not check-in.
  if (plant.status === "collected") {
    const collected = plant.collectedAt ? new Date(plant.collectedAt).getTime() : NaN;
    if (Number.isFinite(collected)) return collected;
  }

  return new Date(plant.checkedInAt).getTime();
}

export function sortDashboardPlants(
  plants: DashboardPlant[],
  order: DashboardLaneSortOrder,
): DashboardPlant[] {
  return [...plants].sort((a, b) => {
    const aTime = sortTimestamp(a);
    const bTime = sortTimestamp(b);
    return order === "newest" ? bTime - aTime : aTime - bTime;
  });
}

export function toggleDashboardLaneSortOrder(
  order: DashboardLaneSortOrder,
): DashboardLaneSortOrder {
  return order === "newest" ? "oldest" : "newest";
}

export function dashboardLaneSortLabel(order: DashboardLaneSortOrder): string {
  return order === "newest" ? "Newest" : "Oldest";
}
