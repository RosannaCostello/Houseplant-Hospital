import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { getDashboardPlants } from "@/lib/dashboard/get-dashboard-plants";

export default async function AppHome() {
  const plants = await getDashboardPlants();

  return <KanbanBoard plants={plants} />;
}
