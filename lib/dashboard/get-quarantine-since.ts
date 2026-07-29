import type { SupabaseClient } from "@supabase/supabase-js";

const IN_CHUNK_SIZE = 80;

/** Latest `status_history` timestamp when each plant entered quarantine. */
export async function getQuarantineSinceByPlantIds(
  supabase: SupabaseClient,
  plantIds: string[],
): Promise<Map<string, string>> {
  if (plantIds.length === 0) {
    return new Map();
  }

  const quarantineSince = new Map<string, string>();

  for (let i = 0; i < plantIds.length; i += IN_CHUNK_SIZE) {
    const chunk = plantIds.slice(i, i + IN_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("status_history")
      .select("plant_id, created_at")
      .in("plant_id", chunk)
      .eq("new_status", "quarantine")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load quarantine history: ${error.message}`);
    }

    for (const row of data ?? []) {
      if (!row.plant_id || quarantineSince.has(row.plant_id)) {
        continue;
      }

      quarantineSince.set(row.plant_id, row.created_at);
    }
  }

  return quarantineSince;
}
