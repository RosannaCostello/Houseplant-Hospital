/** Size bands used at check-in / pricing (Mini–XL). */
export const PLANT_SIZES = ["Mini", "S", "M", "L", "XL"] as const;

export type PlantSize = (typeof PLANT_SIZES)[number];

/** Legacy app value before HIL-113 rename (stored as XS). */
const LEGACY_MINI_ALIASES = new Set(["XS", "xs", "MINI", "mini", "Mini"]);

export function isPlantSize(value: string): value is PlantSize {
  return (PLANT_SIZES as readonly string[]).includes(value);
}

/** Map stored or imported size strings onto a canonical PlantSize. */
export function coercePlantSize(value: string): PlantSize | null {
  const trimmed = value.trim();
  if (LEGACY_MINI_ALIASES.has(trimmed)) return "Mini";
  if (isPlantSize(trimmed)) return trimmed;
  return null;
}

/** Staff-facing / label size text (never shows legacy XS). */
export function formatPlantSizeLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  return coercePlantSize(value) ?? value.trim();
}
