"use client";

import { useCallback, useState } from "react";
import { KanbanLane } from "@/components/dashboard/kanban-lane";
import { PlantCard } from "@/components/dashboard/plant-card";
import {
  dashboardLaneSortLabel,
  sortDashboardPlants,
  toggleDashboardLaneSortOrder,
  type DashboardLaneSortOrder,
} from "@/lib/dashboard/sort-dashboard-plants";
import type { DashboardPlant } from "@/lib/dashboard/types";
import { PLANT_STATUS_LANES, type PlantStatus } from "@/lib/plant-status";

type KanbanBoardProps = {
  plants?: DashboardPlant[];
};

const DEFAULT_SORT_ORDER: DashboardLaneSortOrder = "newest";

function groupPlantsByStatus(plants: DashboardPlant[]): Record<PlantStatus, DashboardPlant[]> {
  const grouped = Object.fromEntries(
    PLANT_STATUS_LANES.map((lane) => [lane.status, [] as DashboardPlant[]]),
  ) as Record<PlantStatus, DashboardPlant[]>;

  for (const plant of plants) {
    grouped[plant.status]?.push(plant);
  }

  return grouped;
}

function initialSortByLane(): Record<PlantStatus, DashboardLaneSortOrder> {
  return Object.fromEntries(
    PLANT_STATUS_LANES.map((lane) => [lane.status, DEFAULT_SORT_ORDER]),
  ) as Record<PlantStatus, DashboardLaneSortOrder>;
}

export function KanbanBoard({ plants = [] }: KanbanBoardProps) {
  const [sortByLane, setSortByLane] = useState(initialSortByLane);
  const plantsByStatus = groupPlantsByStatus(plants);

  const toggleLaneSort = useCallback((status: PlantStatus) => {
    setSortByLane((current) => ({
      ...current,
      [status]: toggleDashboardLaneSortOrder(current[status] ?? DEFAULT_SORT_ORDER),
    }));
  }, []);

  return (
    <div className="relative min-h-0 flex-1 basis-0 overflow-hidden">
      <div
        className="flex h-full max-h-full min-h-0 w-full flex-nowrap items-stretch gap-3 overflow-x-auto overscroll-x-contain px-1 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch]"
        aria-label="Plant workflow lanes"
      >
        {PLANT_STATUS_LANES.map((lane) => {
          const lanePlants = sortDashboardPlants(
            plantsByStatus[lane.status],
            sortByLane[lane.status] ?? DEFAULT_SORT_ORDER,
          );
          const sortOrder = sortByLane[lane.status] ?? DEFAULT_SORT_ORDER;

          return (
            <KanbanLane
              key={lane.status}
              lane={lane}
              count={lanePlants.length}
              sortOrder={sortOrder}
              onToggleSort={() => toggleLaneSort(lane.status)}
            >
              {lanePlants.map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </KanbanLane>
          );
        })}
      </div>
    </div>
  );
}
