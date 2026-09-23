import type { SupabaseClient } from "@supabase/supabase-js";

export type SaveSurgerySignOffResult = { success: true } | { success: false; error: string };

export async function saveSurgerySignOffWithClient(
  supabase: SupabaseClient,
  plantId: string,
  staffId: string | null,
): Promise<SaveSurgerySignOffResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
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

  if (plant.status !== "in_surgery") {
    return { success: false, error: "Surgery sign-off can only be set while the plant is in Surgery." };
  }

  if (staffId) {
    const { data: staff, error: staffError } = await supabase
      .from("hospital_staff")
      .select("id")
      .eq("id", staffId)
      .eq("active", true)
      .maybeSingle();

    if (staffError) {
      return { success: false, error: staffError.message };
    }

    if (!staff) {
      return { success: false, error: "Choose a valid staff member." };
    }
  }

  const { error: updateError } = await supabase
    .from("plants")
    .update({ surgery_completed_by: staffId })
    .eq("id", plantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
