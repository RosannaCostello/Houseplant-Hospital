import { notFound } from "next/navigation";
import { PlantDetailView } from "@/components/plants/plant-detail-view";
import { getPlantDetail } from "@/lib/plants/get-plant-detail";

type PlantDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlantDetailPage({ params }: PlantDetailPageProps) {
  const { id } = await params;
  const plant = await getPlantDetail(id);

  if (!plant) {
    notFound();
  }

  return <PlantDetailView plant={plant} />;
}
