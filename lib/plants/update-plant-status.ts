import type { SupabaseClient } from "@supabase/supabase-js";
import { emitPlantStatusChangeEvent } from "@/lib/mailchimp/emit-plant-event";
import type { PlantStatus } from "@/lib/plant-status";
import { PLANT_STATUSES } from "@/lib/plant-status";

export type UpdatePlantStatusResult =
  | { success: true; previousStatus: PlantStatus; newStatus: PlantStatus }
  | { success: false; error: string };

function isPlantStatus(value: string): value is PlantStatus {
  return (PLANT_STATUSES as readonly string[]).includes(value);
}

export async function updatePlantStatusWithClient(
  supabase: SupabaseClient,
  plantId: string,
  newStatus: PlantStatus,
): Promise<UpdatePlantStatusResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update plant status." };
  }

  const { data: plant, error: fetchError } = await supabase
    .from("plants")
    .select("status")
    .eq("id", plantId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!plant?.status || !isPlantStatus(plant.status)) {
    return { success: false, error: "Plant not found." };
  }

  if (plant.status === newStatus) {
    return { success: true, previousStatus: plant.status, newStatus };
  }

  const { error: updateError } = await supabase
    .from("plants")
    .update({ status: newStatus })
    .eq("id", plantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { error: historyError } = await supabase.from("status_history").insert({
    plant_id: plantId,
    previous_status: plant.status,
    new_status: newStatus,
    changed_by: user.id,
  });

  if (historyError) {
    await supabase.from("plants").update({ status: plant.status }).eq("id", plantId);
    return { success: false, error: historyError.message };
  }

  await emitPlantStatusChangeEvent(supabase, plantId, plant.status, newStatus);

  return { success: true, previousStatus: plant.status, newStatus };
}
