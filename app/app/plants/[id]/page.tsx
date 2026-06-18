import { notFound } from "next/navigation";
import { PlantDetailView } from "@/components/plants/plant-detail-view";
import { getPlantDetail } from "@/lib/plants/get-plant-detail";
import { DEFAULT_BUGS_SURCHARGE_PERCENT } from "@/lib/pricing/defaults";
import { getBugsSurchargeRule } from "@/lib/pricing/get-bugs-surcharge-rule";
import { getPlantPricing } from "@/lib/pricing/get-plant-pricing";
import { isShopifyPricingConfigured } from "@/lib/shopify/env";
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

  const shopifyPricing = isShopifyPricingConfigured();

  const [bugsRule, pricing] = await Promise.all([
    shopifyPricing
      ? Promise.resolve(null)
      : getBugsSurchargeRule().catch(() => ({ percent: DEFAULT_BUGS_SURCHARGE_PERCENT })),
    getPlantPricing(id).catch(() => null),
  ]);

  return (
    <PlantDetailView
      plant={plant}
      pricing={pricing}
      pestsPricingFromShopify={shopifyPricing}
      bugsSurchargePercent={bugsRule?.percent ?? null}
    />
  );
}
