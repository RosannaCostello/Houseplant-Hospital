import type { PlantStatus } from "@/lib/plant-status";

/** Display shape for a plant on the dashboard kanban. */
export type DashboardPlant = {
  id: string;
  status: PlantStatus;
  customerName: string;
  name: string | null;
  species: string | null;
  size: string;
  bugsFound: boolean | null;
  checkedInAt: string;
  quarantineSince: string | null;
  visitPlantIndex: number;
  visitPlantTotal: number;
  outpatientCollectionBadge: string | null;
  collectedAt: string | null;
  thumbnailUrl?: string | null;
};
