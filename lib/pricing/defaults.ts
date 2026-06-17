import type { PlantSize } from "@/lib/plant-size";

/** HIL-9 seed values when pricing_rules rows are missing. */
export const DEFAULT_BASE_PRICES: Record<PlantSize, number> = {
  XS: 12,
  S: 18,
  M: 25,
  L: 35,
  XL: 35,
};

export const DEFAULT_BUGS_SURCHARGE_PERCENT = 10;
