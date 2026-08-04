"use server";

import { getAppCopySettings } from "@/lib/care-tips/get-app-copy-settings";
import { getCareTipOptions } from "@/lib/care-tips/get-care-tip-options";
import type { CareTipOptionsByCategory } from "@/lib/care-tips/types";
import { getPestTreatmentOptions } from "@/lib/pest-treatments/get-pest-treatment-options";
import type { PestTreatmentOption } from "@/lib/pest-treatments/types";
import { getPlantDetail, type PlantDetail } from "@/lib/plants/get-plant-detail";
import { getPlantPricing } from "@/lib/pricing/get-plant-pricing";
import type { PlantPriceBreakdown } from "@/lib/pricing/types";
import { isValidRouteId } from "@/lib/validation/parse-route-id";

export type PlantDetailModalPayload = {
  plant: PlantDetail;
  pricing: PlantPriceBreakdown | null;
  careTipOptions: CareTipOptionsByCategory;
  pestTreatmentOptions: PestTreatmentOption[];
  treatmentNotesPlaceholder: string;
};

export async function getPlantDetailModalAction(
  plantId: string,
): Promise<{ success: true; data: PlantDetailModalPayload } | { success: false; error: string }> {
  if (!isValidRouteId(plantId)) {
    return { success: false, error: "Invalid plant." };
  }

  const plant = await getPlantDetail(plantId);
  if (!plant) {
    return { success: false, error: "Plant not found." };
  }

  const [pricing, careTipOptions, pestTreatmentOptions, appCopy] = await Promise.all([
    getPlantPricing(plantId).catch(() => null),
    getCareTipOptions(),
    getPestTreatmentOptions().catch(() => []),
    getAppCopySettings(),
  ]);

  return {
    success: true,
    data: {
      plant,
      pricing,
      careTipOptions,
      pestTreatmentOptions,
      treatmentNotesPlaceholder: appCopy.treatmentNotesPlaceholder,
    },
  };
}
