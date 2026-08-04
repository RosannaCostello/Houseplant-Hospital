import { notFound } from "next/navigation";
import { SetPageTitle } from "@/components/app/app-page-title";
import { PlantDetailView } from "@/components/plants/plant-detail-view";
import { getAppCopySettings } from "@/lib/care-tips/get-app-copy-settings";
import { getCareTipOptions } from "@/lib/care-tips/get-care-tip-options";
import { getPestTreatmentOptions } from "@/lib/pest-treatments/get-pest-treatment-options";
import { getPlantDetail } from "@/lib/plants/get-plant-detail";
import { formatCustomerPlantTitle } from "@/lib/plants/format-customer-plant-title";
import { getPlantPricing } from "@/lib/pricing/get-plant-pricing";
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

  const [pricing, careTipOptions, pestTreatmentOptions, appCopy] = await Promise.all([
    getPlantPricing(id).catch(() => null),
    getCareTipOptions(),
    getPestTreatmentOptions().catch(() => []),
    getAppCopySettings(),
  ]);

  return (
    <>
      <SetPageTitle title={formatCustomerPlantTitle(plant.customer)} />
      <PlantDetailView
        plant={plant}
        pricing={pricing}
        careTipOptions={careTipOptions}
        pestTreatmentOptions={pestTreatmentOptions}
        treatmentNotesPlaceholder={appCopy.treatmentNotesPlaceholder}
      />
    </>
  );
}
