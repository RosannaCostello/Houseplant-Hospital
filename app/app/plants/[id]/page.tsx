import { notFound } from "next/navigation";
import { PlantDetailView } from "@/components/plants/plant-detail-view";
import { getPlantDetail } from "@/lib/plants/get-plant-detail";
import { getBugsSurchargeRule } from "@/lib/pricing/get-bugs-surcharge-rule";
import { getPlantPricing } from "@/lib/pricing/get-plant-pricing";

export const dynamic = "force-dynamic";

type PlantDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlantDetailPage({ params }: PlantDetailPageProps) {
  const { id } = await params;
  const [plant, bugsRule, pricing] = await Promise.all([
    getPlantDetail(id),
    getBugsSurchargeRule(),
    getPlantPricing(id),
  ]);

  if (!plant || !pricing) {
    notFound();
  }

  return (
    <PlantDetailView
      plant={plant}
      pricing={pricing}
      bugsSurchargePercent={bugsRule.percent}
    />
  );
}
