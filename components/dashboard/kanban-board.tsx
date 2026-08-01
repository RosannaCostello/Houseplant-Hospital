"use client";

import { useCallback, useMemo, useState } from "react";
import { DraftCheckInCard } from "@/components/dashboard/draft-check-in-card";
import { IncompleteCheckInsLane } from "@/components/dashboard/incomplete-check-ins-lane";
import { KanbanLane } from "@/components/dashboard/kanban-lane";
import { PlantCard } from "@/components/dashboard/plant-card";
import {
  sortDashboardPlants,
  toggleDashboardLaneSortOrder,
  type DashboardLaneSortOrder,
} from "@/lib/dashboard/sort-dashboard-plants";
import type { DashboardPlant } from "@/lib/dashboard/types";
import type { IncompleteCheckInDraft } from "@/lib/check-in/check-in-draft-types";
import { PLANT_STATUS_LANES, type PlantStatus } from "@/lib/plant-status";

type KanbanBoardProps = {
  plants?: DashboardPlant[];
  incompleteDrafts?: IncompleteCheckInDraft[];
};

const DEFAULT_SORT_ORDER: DashboardLaneSortOrder = "newest";

function matchesSearch(
  query: string,
  name: string,
  email: string,
): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return name.toLowerCase().includes(needle) || email.toLowerCase().includes(needle);
}

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

export function KanbanBoard({ plants = [], incompleteDrafts = [] }: KanbanBoardProps) {
  const [sortByLane, setSortByLane] = useState(initialSortByLane);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlants = useMemo(
    () =>
      plants.filter((plant) =>
        matchesSearch(searchQuery, plant.customerName, plant.customerEmail),
      ),
    [plants, searchQuery],
  );

  const filteredDrafts = useMemo(
    () =>
      incompleteDrafts.filter((draft) =>
        matchesSearch(searchQuery, draft.customerName, draft.customerEmail),
      ),
    [incompleteDrafts, searchQuery],
  );

  const plantsByStatus = groupPlantsByStatus(filteredPlants);

  const toggleLaneSort = useCallback((status: PlantStatus) => {
    setSortByLane((current) => ({
      ...current,
      [status]: toggleDashboardLaneSortOrder(current[status] ?? DEFAULT_SORT_ORDER),
    }));
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 basis-0 flex-col gap-3">
      <div className="shrink-0 px-1">
        <label className="sr-only" htmlFor="dashboard-search">
          Search plants by customer name or email
        </label>
        <input
          id="dashboard-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name or email…"
          className="w-full max-w-md rounded-hilda border border-hilda-border/20 bg-hilda-surface px-3 py-2 text-sm text-hilda-text placeholder:text-hilda-text-muted focus:border-hilda-border/40 focus:outline-none"
          autoComplete="off"
        />
      </div>

      <div
        className="flex h-full max-h-full min-h-0 w-full flex-nowrap items-stretch gap-8 overflow-x-auto overflow-y-visible overscroll-x-contain px-1 py-2 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch]"
        aria-label="Plant workflow lanes"
      >
        <IncompleteCheckInsLane count={filteredDrafts.length}>
          {filteredDrafts.map((draft) => (
            <DraftCheckInCard key={draft.id} draft={draft} />
          ))}
        </IncompleteCheckInsLane>

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
