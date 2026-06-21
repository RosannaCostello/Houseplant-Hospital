import { notFound } from "next/navigation";
import { PlantDetailView } from "@/components/plants/plant-detail-view";
import { getPlantDetail } from "@/lib/plants/get-plant-detail";
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

  const pricing = await getPlantPricing(id).catch(() => null);

  return <PlantDetailView plant={plant} pricing={pricing} />;
}
