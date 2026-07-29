import type { SupabaseClient } from "@supabase/supabase-js";

/** Keep `.in()` URL filters under PostgREST / proxy length limits. */
const IN_CHUNK_SIZE = 80;

async function mapInChunks<T>(
  ids: string[],
  loadChunk: (chunk: string[]) => Promise<T[]>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + IN_CHUNK_SIZE);
    rows.push(...(await loadChunk(chunk)));
  }

  return rows;
}

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

  try {
    const data = await mapInChunks(plantIds, async (chunk) => {
      const { data: rows, error } = await supabase
        .from("plants")
        .select("id, collected_at")
        .in("id", chunk);

      if (error) {
        throw error;
      }

      return rows ?? [];
    });

    const collectedAt = new Map<string, string>();

    for (const row of data) {
      if (!row.id || !row.collected_at) {
        continue;
      }

      collectedAt.set(row.id, row.collected_at);
    }

    return collectedAt;
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : error instanceof Error
          ? error.message
          : String(error);

    if (isMissingCollectedAtColumn({ message })) {
      return new Map();
    }

    throw new Error(`Failed to load collected dates: ${message}`);
  }
}

/** Latest `status_history` timestamp when each plant entered collected. */
export async function getCollectedSinceByPlantIds(
  supabase: SupabaseClient,
  plantIds: string[],
): Promise<Map<string, string>> {
  if (plantIds.length === 0) {
    return new Map();
  }

  const data = await mapInChunks(plantIds, async (chunk) => {
    const { data: rows, error } = await supabase
      .from("status_history")
      .select("plant_id, created_at")
      .in("plant_id", chunk)
      .eq("new_status", "collected")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load collected history: ${error.message}`);
    }

    return rows ?? [];
  });

  const collectedSince = new Map<string, string>();

  for (const row of data) {
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
