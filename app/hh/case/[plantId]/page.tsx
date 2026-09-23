import { notFound, redirect } from "next/navigation";
import { getVisitIdForPublicPlant } from "@/lib/plants/get-public-care-card";
import { isValidRouteId } from "@/lib/validation/parse-route-id";

type PublicPlantCasePageProps = {
  params: Promise<{ plantId: string }>;
};

/** Legacy QR case URL → visit Care Card (optional plant highlight). */
export default async function PublicPlantCasePage({ params }: PublicPlantCasePageProps) {
  const { plantId } = await params;

  if (!isValidRouteId(plantId)) {
    notFound();
  }

  const visitId = await getVisitIdForPublicPlant(plantId);

  if (!visitId) {
    notFound();
  }

  redirect(`/hh/care/${visitId}?plant=${plantId}`);
}
