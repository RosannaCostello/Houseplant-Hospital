const VISIT_IMPORT_MARKERS = new Set([
  "zoho-import",
  "zoho-import-final",
  "shopify-import",
]);

export function isVisitImportMarker(notes: string | null | undefined): boolean {
  return Boolean(notes && VISIT_IMPORT_MARKERS.has(notes.trim()));
}

export function plantCheckInLabel(
  plant: { name?: string | null; species?: string | null },
  oneBasedIndex: number,
): string {
  return plant.name?.trim() || plant.species?.trim() || `Plant ${oneBasedIndex}`;
}

/** Prefer plants.notes; fall back to legacy combined visits.notes for older drop-offs. */
export function resolvePlantInternalNotes(args: {
  plantNotes: string | null | undefined;
  visitNotes: string | null | undefined;
  name: string | null;
  species: string | null;
  visitPlantIndex: number;
  visitPlantTotal: number;
}): string | null {
  const own = args.plantNotes?.trim();
  if (own) return own;

  const visit = args.visitNotes?.trim();
  if (!visit || isVisitImportMarker(visit)) return null;

  if (args.visitPlantTotal <= 1) return visit;

  const prefix = `${plantCheckInLabel(args, args.visitPlantIndex)}: `;
  for (const line of visit.split("\n")) {
    if (line.startsWith(prefix)) {
      const rest = line.slice(prefix.length).trim();
      return rest || null;
    }
  }

  return null;
}
