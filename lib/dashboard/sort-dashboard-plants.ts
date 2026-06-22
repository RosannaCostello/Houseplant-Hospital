import type { DashboardPlant } from "@/lib/dashboard/types";

export type DashboardLaneSortOrder = "newest" | "oldest";

export function sortDashboardPlants(
  plants: DashboardPlant[],
  order: DashboardLaneSortOrder,
): DashboardPlant[] {
  return [...plants].sort((a, b) => {
    const aTime = new Date(a.checkedInAt).getTime();
    const bTime = new Date(b.checkedInAt).getTime();
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
