export const dynamic = "force-dynamic";

import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { getDashboardPlants } from "@/lib/dashboard/get-dashboard-plants";

export default async function AppHome() {
  const plants = await getDashboardPlants();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <KanbanBoard plants={plants} />
    </div>
  );
}
