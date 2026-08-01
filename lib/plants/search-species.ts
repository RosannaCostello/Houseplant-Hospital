import { escapeIlike } from "@/lib/customers/escape-ilike";
import { SPECIES_AUTOCOMPLETE_MIN_LENGTH } from "@/lib/plants/species-constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SPECIES_AUTOCOMPLETE_LIMIT = 12;
const SPECIES_FETCH_LIMIT = 80;

/**
 * Distinct plant species matching a query (case-insensitive substring).
 * Keeps the first spelling seen for each lowercased value.
 */
export async function searchPlantSpecies(query: string): Promise<string[]> {
  const trimmed = query.trim();

  if (trimmed.length < SPECIES_AUTOCOMPLETE_MIN_LENGTH) {
    return [];
  }

  const pattern = `%${escapeIlike(trimmed)}%`;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("plants")
    .select("species")
    .not("species", "is", null)
    .neq("species", "")
    .ilike("species", pattern)
    .order("species", { ascending: true })
    .limit(SPECIES_FETCH_LIMIT);

  if (error) {
    throw new Error(`Failed to search plant species: ${error.message}`);
  }

  const seen = new Set<string>();
  const results: string[] = [];

  for (const row of data ?? []) {
    const species = typeof row.species === "string" ? row.species.trim() : "";
    if (!species) continue;

    const key = species.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    results.push(species);

    if (results.length >= SPECIES_AUTOCOMPLETE_LIMIT) {
      break;
    }
  }

  return results;
}
