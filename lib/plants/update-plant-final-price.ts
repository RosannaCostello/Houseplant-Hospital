import type { SupabaseClient } from "@supabase/supabase-js";
import { roundMoney } from "@/lib/pricing/round-money";

export type UpdatePlantFinalPriceResult =
  | { success: true; finalPrice: number }
  | { success: false; error: string };

export async function updatePlantFinalPriceWithClient(
  supabase: SupabaseClient,
  plantId: string,
  finalPrice: number,
): Promise<UpdatePlantFinalPriceResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update the final price." };
  }

  const price = roundMoney(finalPrice);
  if (!Number.isFinite(price) || price <= 0) {
    return { success: false, error: "Final price must be greater than zero." };
  }

  const { data: plant, error: fetchError } = await supabase
    .from("plants")
    .select("id")
    .eq("id", plantId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!plant) {
    return { success: false, error: "Plant not found." };
  }

  const { error: updateError } = await supabase
    .from("plants")
    .update({ final_price: price })
    .eq("id", plantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, finalPrice: price };
}
