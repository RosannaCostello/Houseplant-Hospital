export const dynamic = "force-dynamic";

import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { getDashboardPlants } from "@/lib/dashboard/get-dashboard-plants";
import { getIncompleteCheckInDrafts } from "@/lib/dashboard/get-incomplete-check-in-drafts";

export default async function AppHome() {
  const [plants, incompleteDrafts] = await Promise.all([
    getDashboardPlants(),
    getIncompleteCheckInDrafts(),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <KanbanBoard plants={plants} incompleteDrafts={incompleteDrafts} />
    </div>
  );
}
