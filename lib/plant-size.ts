/** Size bands from scope / pricing_rules (XS–XL). */
export const PLANT_SIZES = ["XS", "S", "M", "L", "XL"] as const;

export type PlantSize = (typeof PLANT_SIZES)[number];

export function isPlantSize(value: string): value is PlantSize {
  return (PLANT_SIZES as readonly string[]).includes(value);
}
