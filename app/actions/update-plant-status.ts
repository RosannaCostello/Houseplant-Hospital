"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updatePlantStatusWithClient } from "@/lib/plants/update-plant-status";
import { PLANT_STATUSES } from "@/lib/plant-status";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updatePlantStatusSchema = z.object({
  plantId: z.string().uuid(),
  newStatus: z.enum(PLANT_STATUSES),
});

export type UpdatePlantStatusActionResult = Awaited<
  ReturnType<typeof updatePlantStatusWithClient>
>;

export async function updatePlantStatusAction(
  plantId: string,
  newStatus: z.infer<typeof updatePlantStatusSchema>["newStatus"],
): Promise<UpdatePlantStatusActionResult> {
  const parsed = updatePlantStatusSchema.safeParse({ plantId, newStatus });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or status." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updatePlantStatusWithClient(
    supabase,
    parsed.data.plantId,
    parsed.data.newStatus,
  );

  if (result.success) {
    revalidatePath("/app");
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
    revalidatePath(`/hh/case/${parsed.data.plantId}`);
  }

  return result;
}
