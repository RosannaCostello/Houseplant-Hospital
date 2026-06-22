import type { SupabaseClient } from "@supabase/supabase-js";

function isMissingCollectedAtColumn(error: { message?: string }): boolean {
  return Boolean(error.message?.includes("collected_at"));
}

/** `plants.collected_at` when migration 0006 is applied; empty map if column missing. */
export async function getCollectedAtByPlantIds(
  supabase: SupabaseClient,
  plantIds: string[],
): Promise<Map<string, string>> {
  if (plantIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("plants")
    .select("id, collected_at")
    .in("id", plantIds);

  if (error) {
    if (isMissingCollectedAtColumn(error)) {
      return new Map();
    }

    throw new Error(`Failed to load collected dates: ${error.message}`);
  }

  const collectedAt = new Map<string, string>();

  for (const row of data ?? []) {
    if (!row.id || !row.collected_at) {
      continue;
    }

    collectedAt.set(row.id, row.collected_at);
  }

  return collectedAt;
}

/** Latest `status_history` timestamp when each plant entered collected. */
export async function getCollectedSinceByPlantIds(
  supabase: SupabaseClient,
  plantIds: string[],
): Promise<Map<string, string>> {
  if (plantIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("status_history")
    .select("plant_id, created_at")
    .in("plant_id", plantIds)
    .eq("new_status", "collected")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load collected history: ${error.message}`);
  }

  const collectedSince = new Map<string, string>();

  for (const row of data ?? []) {
    if (!row.plant_id || collectedSince.has(row.plant_id)) {
      continue;
    }

    collectedSince.set(row.plant_id, row.created_at);
  }

  return collectedSince;
}

/** Prefer `plants.collected_at`; fall back to latest move into collected lane. */
export async function resolveCollectedAtByPlantIds(
  supabase: SupabaseClient,
  plantIds: string[],
): Promise<Map<string, string>> {
  if (plantIds.length === 0) {
    return new Map();
  }

  const [collectedAtByPlantId, collectedSinceByPlantId] = await Promise.all([
    getCollectedAtByPlantIds(supabase, plantIds),
    getCollectedSinceByPlantIds(supabase, plantIds),
  ]);

  const resolved = new Map<string, string>();

  for (const plantId of plantIds) {
    const collectedAt =
      collectedAtByPlantId.get(plantId) ?? collectedSinceByPlantId.get(plantId) ?? null;

    if (collectedAt) {
      resolved.set(plantId, collectedAt);
    }
  }

  return resolved;
}
