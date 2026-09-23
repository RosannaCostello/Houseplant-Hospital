import type { PlantSize } from "@/lib/plant-size";

/** Shopify Admin product IDs (for reference / future use). */
export const SHOPIFY_STANDARD_PRODUCT_ID = "15770464616829";
export const SHOPIFY_PESTS_PRODUCT_ID = "15827718668669";
export const SHOPIFY_PROPAGATION_PRODUCT_ID = "15972533600637";
/** Delta only: pests(size) − standard(size). Used for post–check-in pests top-up POS carts. */
export const SHOPIFY_PESTS_SURCHARGE_PRODUCT_ID = "16031780831613";

/**
 * Shopify variant IDs per app size band.
 * App size Mini matches Shopify option "Mini" on standard / pests / propagation / pests surcharge.
 */
export const SHOPIFY_VARIANT_IDS: Record<
  PlantSize,
  {
    standardVariantId: string;
    pestsVariantId: string;
    propagationVariantId: string;
    /** Pests-only delta SKU (not the full pests treatment product). */
    pestsSurchargeVariantId: string;
    shopifySizeLabel: string;
  }
> = {
  Mini: {
    shopifySizeLabel: "Mini",
    standardVariantId: "57808365977981",
    pestsVariantId: "57895455293821",
    propagationVariantId: "58437113577853",
    pestsSurchargeVariantId: "58717276897661",
  },
  S: {
    shopifySizeLabel: "Small",
    standardVariantId: "57724214378877",
    pestsVariantId: "57895455326589",
    propagationVariantId: "58437113610621",
    pestsSurchargeVariantId: "58717276930429",
  },
  M: {
    shopifySizeLabel: "Medium",
    standardVariantId: "57724214411645",
    pestsVariantId: "57895455359357",
    propagationVariantId: "58437113643389",
    pestsSurchargeVariantId: "58717276963197",
  },
  L: {
    shopifySizeLabel: "Large",
    standardVariantId: "57724214444413",
    pestsVariantId: "57895455392125",
    propagationVariantId: "58437113676157",
    pestsSurchargeVariantId: "58717276995965",
  },
  XL: {
    shopifySizeLabel: "XL",
    standardVariantId: "57724214477181",
    pestsVariantId: "57895455424893",
    propagationVariantId: "58437113708925",
    pestsSurchargeVariantId: "58717277028733",
  },
};

export const SHOPIFY_ADMIN_API_VERSION = "2024-10";
