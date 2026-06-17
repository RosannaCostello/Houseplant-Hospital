import { notFound } from "next/navigation";
import { PublicPlantCaseView } from "@/components/plants/public-plant-case-view";
import { getPublicPlantCase } from "@/lib/plants/get-public-plant-case";

type PublicPlantCasePageProps = {
  params: Promise<{ plantId: string }>;
};

export default async function PublicPlantCasePage({ params }: PublicPlantCasePageProps) {
  const { plantId } = await params;
  const plant = await getPublicPlantCase(plantId);

  if (!plant) {
    notFound();
  }

  return <PublicPlantCaseView plant={plant} />;
}
