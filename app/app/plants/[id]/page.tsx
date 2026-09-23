import { notFound } from "next/navigation";
import { SetPageTitle } from "@/components/app/app-page-title";
import { PlantDetailView } from "@/components/plants/plant-detail-view";
import { getAppCopySettings } from "@/lib/care-tips/get-app-copy-settings";
import { getCareTipOptions } from "@/lib/care-tips/get-care-tip-options";
import { getOutpatientZoneOptions } from "@/lib/outpatient-zones/get-outpatient-zone-options";
import { getPestTreatmentOptions } from "@/lib/pest-treatments/get-pest-treatment-options";
import { getPestTypeOptions } from "@/lib/pest-types/get-pest-type-options";
import { getPlantDetail } from "@/lib/plants/get-plant-detail";
import { formatCustomerPlantTitle } from "@/lib/plants/format-customer-plant-title";
import { getPlantPricing } from "@/lib/pricing/get-plant-pricing";
import { getHospitalStaffWithClient } from "@/lib/staff/get-hospital-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidRouteId } from "@/lib/validation/parse-route-id";

export const dynamic = "force-dynamic";

type PlantDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlantDetailPage({ params }: PlantDetailPageProps) {
  const { id } = await params;

  if (!isValidRouteId(id)) {
    notFound();
  }

  const plant = await getPlantDetail(id);

  if (!plant) {
    notFound();
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
    getPlantPricing(id).catch(() => null),
    getCareTipOptions(),
    getPestTreatmentOptions().catch(() => []),
    getPestTypeOptions().catch(() => []),
    getOutpatientZoneOptions().catch(() => []),
    getAppCopySettings(),
    getHospitalStaffWithClient(supabase).catch(() => []),
  ]);

  return (
    <>
      <SetPageTitle title={formatCustomerPlantTitle(plant.customer)} />
      <PlantDetailView
        plant={plant}
        pricing={pricing}
        careTipOptions={careTipOptions}
        pestTreatmentOptions={pestTreatmentOptions}
        pestTypeOptions={pestTypeOptions}
        outpatientZoneOptions={outpatientZoneOptions}
        treatmentNotesPlaceholder={appCopy.treatmentNotesPlaceholder}
        hospitalStaff={hospitalStaff}
      />
    </>
  );
}
