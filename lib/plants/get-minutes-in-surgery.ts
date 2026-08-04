import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Completed surgery stint duration in minutes: latest exit from in_surgery
 * (to outpatient or dead) minus the matching enter into in_surgery.
 * Returns null if the plant never completed a surgery stint.
 */
export async function getMinutesInSurgeryWithClient(
  supabase: SupabaseClient,
  plantId: string,
): Promise<number | null> {
  const { data: exitRow, error: exitError } = await supabase
    .from("status_history")
    .select("created_at")
    .eq("plant_id", plantId)
    .eq("previous_status", "in_surgery")
    .in("new_status", ["outpatient", "dead"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exitError) {
    throw new Error(`Failed to load surgery exit: ${exitError.message}`);
  }

  if (!exitRow?.created_at) {
    return null;
  }

  const { data: enterRow, error: enterError } = await supabase
    .from("status_history")
    .select("created_at")
    .eq("plant_id", plantId)
    .eq("new_status", "in_surgery")
    .lte("created_at", exitRow.created_at)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (enterError) {
    throw new Error(`Failed to load surgery enter: ${enterError.message}`);
  }

  if (!enterRow?.created_at) {
    return null;
  }

  const minutes =
    (new Date(exitRow.created_at).getTime() - new Date(enterRow.created_at).getTime()) / 60_000;

  if (!Number.isFinite(minutes) || minutes < 0) {
    return null;
  }

  return minutes;
}

/** Human-readable surgery duration (minutes input). */
export function formatMinutesInSurgery(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const mins = Math.round(value);
  if (mins < 60) return `${mins} min`;
  const hours = mins / 60;
  if (hours < 48) return `${hours.toFixed(hours >= 10 ? 0 : 1)} hrs`;
  const days = hours / 24;
  return `${days.toFixed(days >= 10 ? 0 : 1)} days`;
}
