"use server";

import { searchPlantSpecies } from "@/lib/plants/search-species";

export async function searchPlantSpeciesAction(query: string): Promise<string[]> {
  return searchPlantSpecies(query);
}
