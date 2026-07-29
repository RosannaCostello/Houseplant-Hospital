export const PLANT_CATEGORIES = ["standard", "propagation"] as const;

export type PlantCategory = (typeof PLANT_CATEGORIES)[number];

export function isPlantCategory(value: unknown): value is PlantCategory {
  return typeof value === "string" && PLANT_CATEGORIES.includes(value as PlantCategory);
}

export function plantCategoryLabel(category: PlantCategory): string {
  return category === "propagation" ? "Propagation" : "Standard";
}
