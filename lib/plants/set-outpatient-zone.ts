import type { SupabaseClient } from "@supabase/supabase-js";

export type SetOutpatientZoneResult =
  | { success: true; outpatientZoneId: string }
  | { success: false; error: string };

/**
 * Set or change the outpatient zone for a plant that is already Outpatient.
 * Zone is required — clearing is not allowed.
 */
export async function setOutpatientZoneWithClient(
  supabase: SupabaseClient,
  plantId: string,
  outpatientZoneId: string,
): Promise<SetOutpatientZoneResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to set the zone." };
  }

  const zoneId = outpatientZoneId.trim();
  if (!zoneId) {
    return { success: false, error: "Select an outpatient zone." };
  }

  const { data: plant, error: plantError } = await supabase
    .from("plants")
    .select("status")
    .eq("id", plantId)
    .maybeSingle();

  if (plantError) {
    return { success: false, error: plantError.message };
  }

  if (!plant) {
    return { success: false, error: "Plant not found." };
  }

  if (plant.status !== "outpatient") {
    return {
      success: false,
      error: "Zone can only be edited while the plant is Outpatient.",
    };
  }

  const { data: zone, error: zoneError } = await supabase
    .from("outpatient_zone_options")
    .select("id, active")
    .eq("id", zoneId)
    .maybeSingle();

  if (zoneError) {
    if (zoneError.message.includes("outpatient_zone_options")) {
      return {
        success: false,
        error: "Outpatient zones are not available yet. Ask an admin to run the latest migration.",
      };
    }
    return { success: false, error: zoneError.message };
  }

  if (!zone || zone.active !== true) {
    return { success: false, error: "That outpatient zone is not available." };
  }

  const { error: updateError } = await supabase
    .from("plants")
    .update({ outpatient_zone_id: zoneId })
    .eq("id", plantId);

  if (updateError) {
    if (updateError.message.includes("outpatient_zone_id")) {
      return {
        success: false,
        error: "Outpatient zones are not available yet. Ask an admin to run the latest migration.",
      };
    }
    return { success: false, error: updateError.message };
  }

  return { success: true, outpatientZoneId: zoneId };
}
