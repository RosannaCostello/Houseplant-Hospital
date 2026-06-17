import type { SupabaseClient } from "@supabase/supabase-js";
import { getBugsSurchargeRule } from "@/lib/pricing/get-bugs-surcharge-rule";

export type SetBugsFoundResult =
  | { success: true; bugsFound: boolean }
  | { success: false; error: string };

const BUGS_ADJUSTMENT_TYPE = "bugs_surcharge";

export async function setBugsFoundWithClient(
  supabase: SupabaseClient,
  plantId: string,
  bugsFound: boolean,
): Promise<SetBugsFoundResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update bugs found." };
  }

  const { data: plant, error: fetchError } = await supabase
    .from("plants")
    .select("bugs_found")
    .eq("id", plantId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!plant) {
    return { success: false, error: "Plant not found." };
  }

  if (plant.bugs_found === bugsFound) {
    return { success: true, bugsFound };
  }

  let surchargePercent = 0;

  if (bugsFound) {
    const rule = await getBugsSurchargeRule();
    surchargePercent = rule.percent;
  }

  const pricingModifier = bugsFound ? surchargePercent / 100 : 0;

  const { error: updateError } = await supabase
    .from("plants")
    .update({
      bugs_found: bugsFound,
      pricing_modifier: pricingModifier,
    })
    .eq("id", plantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { error: clearError } = await supabase
    .from("pricing_adjustments")
    .delete()
    .eq("plant_id", plantId)
    .eq("adjustment_type", BUGS_ADJUSTMENT_TYPE);

  if (clearError) {
    await supabase
      .from("plants")
      .update({ bugs_found: plant.bugs_found, pricing_modifier: bugsFound ? 0 : pricingModifier })
      .eq("id", plantId);
    return { success: false, error: clearError.message };
  }

  if (bugsFound) {
    const { error: insertError } = await supabase.from("pricing_adjustments").insert({
      plant_id: plantId,
      adjustment_type: BUGS_ADJUSTMENT_TYPE,
      percent: surchargePercent,
      reason: "Bugs found during treatment",
    });

    if (insertError) {
      await supabase
        .from("plants")
        .update({ bugs_found: plant.bugs_found, pricing_modifier: 0 })
        .eq("id", plantId);
      return { success: false, error: insertError.message };
    }
  }

  return { success: true, bugsFound };
}
