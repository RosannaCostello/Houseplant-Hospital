import type { PlantSize } from "@/lib/plant-size";

/** Shopify Admin product IDs (for reference / future use). */
export const SHOPIFY_STANDARD_PRODUCT_ID = "15770464616829";
export const SHOPIFY_PESTS_PRODUCT_ID = "15827718668669";

/**
 * Shopify variant IDs per app size band.
 * Shopify labels the XS band as "Mini" on both standard and pests products.
 */
export const SHOPIFY_VARIANT_IDS: Record<
  PlantSize,
  { standardVariantId: string; pestsVariantId: string; shopifySizeLabel: string }
> = {
  XS: {
    shopifySizeLabel: "Mini",
    standardVariantId: "57808365977981",
    pestsVariantId: "57895455293821",
  },
  S: {
    shopifySizeLabel: "Small",
    standardVariantId: "57724214378877",
    pestsVariantId: "57895455326589",
  },
  M: {
    shopifySizeLabel: "Medium",
    standardVariantId: "57724214411645",
    pestsVariantId: "57895455359357",
  },
  L: {
    shopifySizeLabel: "Large",
    standardVariantId: "57724214444413",
    pestsVariantId: "57895455392125",
  },
  XL: {
    shopifySizeLabel: "XL",
    standardVariantId: "57724214477181",
    pestsVariantId: "57895455424893",
  },
};

export const SHOPIFY_ADMIN_API_VERSION = "2024-10";
