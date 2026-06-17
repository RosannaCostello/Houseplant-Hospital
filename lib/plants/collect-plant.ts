import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlantStatus } from "@/lib/plant-status";
import { PLANT_STATUSES } from "@/lib/plant-status";
import { roundMoney } from "@/lib/pricing/round-money";

export type CollectPlantResult =
  | { success: true; finalPrice: number; collectedAt: string }
  | { success: false; error: string };

function isPlantStatus(value: string): value is PlantStatus {
  return (PLANT_STATUSES as readonly string[]).includes(value);
}

export async function collectPlantWithClient(
  supabase: SupabaseClient,
  plantId: string,
  finalPrice: number,
): Promise<CollectPlantResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to mark a plant collected." };
  }

  const price = roundMoney(finalPrice);
  if (!Number.isFinite(price) || price <= 0) {
    return { success: false, error: "Final price must be greater than zero." };
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

  if (plant.status === "collected") {
    return { success: false, error: "This plant is already collected." };
  }

  const collectedAt = new Date().toISOString();
  const previousStatus = plant.status;

  const { error: updateError } = await supabase
    .from("plants")
    .update({
      status: "collected",
      final_price: price,
      collected_at: collectedAt,
    })
    .eq("id", plantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { error: historyError } = await supabase.from("status_history").insert({
    plant_id: plantId,
    previous_status: previousStatus,
    new_status: "collected",
    changed_by: user.id,
  });

  if (historyError) {
    await supabase
      .from("plants")
      .update({
        status: previousStatus,
        final_price: null,
        collected_at: null,
      })
      .eq("id", plantId);
    return { success: false, error: historyError.message };
  }

  return { success: true, finalPrice: price, collectedAt };
}
