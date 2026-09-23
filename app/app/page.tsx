export const dynamic = "force-dynamic";

import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { getAppCopySettings } from "@/lib/care-tips/get-app-copy-settings";
import { getDashboardPlants } from "@/lib/dashboard/get-dashboard-plants";
import { getIncompleteCheckInDrafts } from "@/lib/dashboard/get-incomplete-check-in-drafts";

export default async function AppHome() {
  const [plants, incompleteDrafts, appCopy] = await Promise.all([
    getDashboardPlants(),
    getIncompleteCheckInDrafts(),
    getAppCopySettings(),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <KanbanBoard
        plants={plants}
        incompleteDrafts={incompleteDrafts}
        stackingCardsEnabled={appCopy.stackingCardsEnabled}
      />
    </div>
  );
}
