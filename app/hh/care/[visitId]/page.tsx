import { notFound } from "next/navigation";
import { CareCardPlantScroll } from "@/components/plants/care-card-plant-scroll";
import { PublicCareCardView } from "@/components/plants/public-care-card-view";
import { getPublicCareCard } from "@/lib/plants/get-public-care-card";
import { isValidRouteId } from "@/lib/validation/parse-route-id";

type CareCardPageProps = {
  params: Promise<{ visitId: string }>;
  searchParams: Promise<{ plant?: string }>;
};

export default async function CareCardPage({ params, searchParams }: CareCardPageProps) {
  const { visitId } = await params;
  const { plant: highlightPlantId } = await searchParams;

  if (!isValidRouteId(visitId)) {
    notFound();
  }

  const card = await getPublicCareCard(visitId);

  if (!card) {
    notFound();
  }

  const highlight =
    typeof highlightPlantId === "string" && isValidRouteId(highlightPlantId)
      ? highlightPlantId
      : undefined;

  return (
    <>
      <CareCardPlantScroll plantId={highlight} />
      <PublicCareCardView card={card} highlightPlantId={highlight} />
    </>
  );
}
