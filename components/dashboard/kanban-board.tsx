import Link from "next/link";
import { PLANT_STATUS_LANES, type PlantStatus } from "@/lib/plant-status";
import type { DashboardPlant } from "@/lib/dashboard/types";
import { KanbanLane } from "@/components/dashboard/kanban-lane";
import { PlantCard } from "@/components/dashboard/plant-card";
import { Button } from "@/components/ui/button";

type KanbanBoardProps = {
  plants?: DashboardPlant[];
};

function groupPlantsByStatus(plants: DashboardPlant[]): Record<PlantStatus, DashboardPlant[]> {
  const grouped = Object.fromEntries(
    PLANT_STATUS_LANES.map((lane) => [lane.status, [] as DashboardPlant[]]),
  ) as Record<PlantStatus, DashboardPlant[]>;

  for (const plant of plants) {
    grouped[plant.status]?.push(plant);
  }

  return grouped;
}

export function KanbanBoard({ plants = [] }: KanbanBoardProps) {
  const plantsByStatus = groupPlantsByStatus(plants);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-hilda-heading">Dashboard</h1>
          <p className="mt-1 text-sm text-hilda-text">
            Plant workflow by status — use the menu on a card to move lanes
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0 uppercase tracking-wide">
          <Link href="/app/check-in">New check-in</Link>
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 basis-0 overflow-hidden">
        <div
          className="flex h-full max-h-full min-h-0 w-full flex-nowrap items-stretch gap-3 overflow-x-auto overscroll-x-contain px-1 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch]"
          aria-label="Plant workflow lanes"
        >
          {PLANT_STATUS_LANES.map((lane) => {
            const lanePlants = plantsByStatus[lane.status];

            return (
              <KanbanLane key={lane.status} lane={lane} count={lanePlants.length}>
                {lanePlants.map((plant) => (
                  <PlantCard key={plant.id} plant={plant} />
                ))}
              </KanbanLane>
            );
          })}
        </div>
      </div>
    </div>
  );
}
