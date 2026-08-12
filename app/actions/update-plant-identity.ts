"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updatePlantIdentityWithClient } from "@/lib/plants/update-plant-identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  plantId: z.string().uuid(),
  name: z.string(),
  species: z.string(),
});

export async function updatePlantIdentityAction(input: {
  plantId: string;
  name: string;
  species: string;
}) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid plant name or species." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updatePlantIdentityWithClient(
    supabase,
    parsed.data.plantId,
    { name: parsed.data.name, species: parsed.data.species },
  );

  if (result.success) {
    revalidatePath("/app");
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
    revalidatePath(`/hh/case/${parsed.data.plantId}`);
  }

  return result;
}
