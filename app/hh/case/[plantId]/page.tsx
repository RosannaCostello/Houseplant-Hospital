import { notFound } from "next/navigation";
import { PublicPlantCaseView } from "@/components/plants/public-plant-case-view";
import { getPublicPlantCase } from "@/lib/plants/get-public-plant-case";
import { isValidRouteId } from "@/lib/validation/parse-route-id";

type PublicPlantCasePageProps = {
  params: Promise<{ plantId: string }>;
};

export default async function PublicPlantCasePage({ params }: PublicPlantCasePageProps) {
  const { plantId } = await params;

  if (!isValidRouteId(plantId)) {
    notFound();
  }

  const plant = await getPublicPlantCase(plantId);

  if (!plant) {
    notFound();
  }

  return <PublicPlantCaseView plant={plant} />;
}
