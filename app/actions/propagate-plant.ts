"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PLANT_SIZES } from "@/lib/plant-size";
import { propagatePlantWithClient } from "@/lib/plants/propagate-plant";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const propagatePlantSchema = z.object({
  plantId: z.string().uuid(),
  size: z.enum(PLANT_SIZES),
});

export type PropagatePlantActionResult = Awaited<ReturnType<typeof propagatePlantWithClient>>;

export async function propagatePlantAction(
  plantId: string,
  size: z.infer<typeof propagatePlantSchema>["size"],
): Promise<PropagatePlantActionResult> {
  const parsed = propagatePlantSchema.safeParse({ plantId, size });
  if (!parsed.success) {
    return { success: false, error: "Select a valid propagation size." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await propagatePlantWithClient(supabase, parsed.data.plantId, parsed.data.size);

  if (result.success) {
    revalidatePath("/app");
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
    revalidatePath(`/app/plants/${result.plantId}`);
  }

  return result;
}
