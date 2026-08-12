import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export type UpdatePlantIdentityResult = { success: true } | { success: false; error: string };

const identitySchema = z.object({
  name: z.string(),
  species: z.string(),
});

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function updatePlantIdentityWithClient(
  supabase: SupabaseClient,
  plantId: string,
  input: { name: string; species: string },
): Promise<UpdatePlantIdentityResult> {
  const parsed = identitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid plant name or species." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to edit plant details." };
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

  if (plant.status === "collected") {
    return { success: false, error: "Collected plants cannot be edited." };
  }

  const { error } = await supabase
    .from("plants")
    .update({
      name: normalizeOptionalText(parsed.data.name),
      species: normalizeOptionalText(parsed.data.species),
    })
    .eq("id", plantId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
