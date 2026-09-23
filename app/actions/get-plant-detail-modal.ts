"use server";

import { getAppCopySettings } from "@/lib/care-tips/get-app-copy-settings";
import { getCareTipOptions } from "@/lib/care-tips/get-care-tip-options";
import type { CareTipOptionsByCategory } from "@/lib/care-tips/types";
import { getOutpatientZoneOptions } from "@/lib/outpatient-zones/get-outpatient-zone-options";
import type { OutpatientZoneOption } from "@/lib/outpatient-zones/types";
import { getPestTreatmentOptions } from "@/lib/pest-treatments/get-pest-treatment-options";
import type { PestTreatmentOption } from "@/lib/pest-treatments/types";
import { getPestTypeOptions } from "@/lib/pest-types/get-pest-type-options";
import type { PestTypeOption } from "@/lib/pest-types/types";
import { getPlantDetail, type PlantDetail } from "@/lib/plants/get-plant-detail";
import { getPlantPricing } from "@/lib/pricing/get-plant-pricing";
import type { PlantPriceBreakdown } from "@/lib/pricing/types";
import { getHospitalStaffWithClient } from "@/lib/staff/get-hospital-staff";
import type { HospitalStaff } from "@/lib/staff/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidRouteId } from "@/lib/validation/parse-route-id";

export type PlantDetailModalPayload = {
  plant: PlantDetail;
  pricing: PlantPriceBreakdown | null;
  careTipOptions: CareTipOptionsByCategory;
  pestTreatmentOptions: PestTreatmentOption[];
  pestTypeOptions: PestTypeOption[];
  outpatientZoneOptions: OutpatientZoneOption[];
  treatmentNotesPlaceholder: string;
  hospitalStaff: HospitalStaff[];
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

  const supabase = await createSupabaseServerClient();
  const [
    pricing,
    careTipOptions,
    pestTreatmentOptions,
    pestTypeOptions,
    outpatientZoneOptions,
    appCopy,
    hospitalStaff,
  ] = await Promise.all([
    getPlantPricing(plantId).catch(() => null),
    getCareTipOptions(),
    getPestTreatmentOptions().catch(() => []),
    getPestTypeOptions().catch(() => []),
    getOutpatientZoneOptions().catch(() => []),
    getAppCopySettings(),
    getHospitalStaffWithClient(supabase).catch(() => []),
  ]);

  return {
    success: true,
    data: {
      plant,
      pricing,
      careTipOptions,
      pestTreatmentOptions,
      pestTypeOptions,
      outpatientZoneOptions,
      treatmentNotesPlaceholder: appCopy.treatmentNotesPlaceholder,
      hospitalStaff,
    },
  };
}
