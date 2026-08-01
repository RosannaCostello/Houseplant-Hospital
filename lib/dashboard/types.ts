import type { PlantStatus } from "@/lib/plant-status";
import type { PlantCategory } from "@/lib/plant-category";
import type { PosPaymentStatus } from "@/lib/shopify/pos-checkout-types";

/** Display shape for a plant on the dashboard kanban. */
export type DashboardPlant = {
  id: string;
  status: PlantStatus;
  customerName: string;
  customerEmail: string;
  name: string | null;
  species: string | null;
  size: string;
  bugsFound: boolean | null;
  plantCategory: PlantCategory;
  hasPropagation: boolean;
  checkedInAt: string;
  quarantineSince: string | null;
  visitPlantIndex: number;
  visitPlantTotal: number;
  outpatientCollectionBadge: string | null;
  collectedAt: string | null;
  paymentStatus: PosPaymentStatus | null;
  shopifyOrderId: string | null;
  thumbnailUrl?: string | null;
};
