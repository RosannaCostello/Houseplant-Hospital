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
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">Plant workflow by status</p>
        </div>
        <Button asChild size="lg">
          <Link href="/app/check-in">New check-in</Link>
        </Button>
      </div>

      <div
        className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory scroll-smooth"
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
  );
}
