import "server-only";

import { emitPlantOutpatientReminderEvent } from "@/lib/mailchimp/emit-plant-event";
import { MAILCHIMP_EVENT_NAMES } from "@/lib/mailchimp/event-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const REMINDER_INTERVAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type EnqueueOutpatientRemindersResult = {
  enqueued: number;
  skipped: number;
  errors: number;
};

function daysSince(iso: string, nowMs: number): number {
  return Math.floor((nowMs - new Date(iso).getTime()) / DAY_MS);
}

function isWithinLastDays(iso: string, days: number, nowMs: number): boolean {
  return nowMs - new Date(iso).getTime() < days * DAY_MS;
}

/**
 * Queue `plant_outpatient_reminder` for plants still outpatient for 14+ days,
 * deduped so at most one reminder per plant per 14-day window.
 */
export async function enqueueOutpatientReminders(
  nowMs: number = Date.now(),
): Promise<EnqueueOutpatientRemindersResult> {
  const supabase = createSupabaseAdminClient();

  const { data: plants, error: plantsError } = await supabase
    .from("plants")
    .select("id, updated_at")
    .eq("status", "outpatient");

  if (plantsError) {
    throw new Error(`Failed to load outpatient plants: ${plantsError.message}`);
  }

  if (!plants?.length) {
    return { enqueued: 0, skipped: 0, errors: 0 };
  }

  const plantIds = plants.map((plant) => plant.id);

  const { data: historyRows, error: historyError } = await supabase
    .from("status_history")
    .select("plant_id, created_at")
    .eq("new_status", "outpatient")
    .in("plant_id", plantIds)
    .order("created_at", { ascending: false });

  if (historyError) {
    throw new Error(`Failed to load outpatient status history: ${historyError.message}`);
  }

  const latestOutpatientAt = new Map<string, string>();
  for (const row of historyRows ?? []) {
    if (typeof row.plant_id !== "string" || typeof row.created_at !== "string") continue;
    if (!latestOutpatientAt.has(row.plant_id)) {
      latestOutpatientAt.set(row.plant_id, row.created_at);
    }
  }

  const cutoffIso = new Date(nowMs - REMINDER_INTERVAL_DAYS * DAY_MS).toISOString();

  const { data: recentEvents, error: eventsError } = await supabase
    .from("mailchimp_events")
    .select("plant_id, created_at, status")
    .eq("event_name", MAILCHIMP_EVENT_NAMES.plantOutpatientReminder)
    .in("plant_id", plantIds)
    .gte("created_at", cutoffIso);

  if (eventsError) {
    throw new Error(`Failed to load recent outpatient reminders: ${eventsError.message}`);
  }

  const recentlyReminded = new Set<string>();
  for (const row of recentEvents ?? []) {
    if (typeof row.plant_id !== "string" || typeof row.created_at !== "string") continue;
    if (isWithinLastDays(row.created_at, REMINDER_INTERVAL_DAYS, nowMs)) {
      recentlyReminded.add(row.plant_id);
    }
  }

  let enqueued = 0;
  let skipped = 0;
  let errors = 0;

  for (const plant of plants) {
    const outpatientSince = latestOutpatientAt.get(plant.id) ?? plant.updated_at;
    if (typeof outpatientSince !== "string" || daysSince(outpatientSince, nowMs) < REMINDER_INTERVAL_DAYS) {
      skipped += 1;
      continue;
    }

    if (recentlyReminded.has(plant.id)) {
      skipped += 1;
      continue;
    }

    const result = await emitPlantOutpatientReminderEvent(supabase, plant.id);
    if (result.success) {
      enqueued += 1;
      recentlyReminded.add(plant.id);
    } else {
      errors += 1;
      console.error("[mailchimp] outpatient reminder enqueue failed:", plant.id, result.error);
    }
  }

  return { enqueued, skipped, errors };
}
