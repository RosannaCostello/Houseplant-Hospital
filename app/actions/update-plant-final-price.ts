"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updatePlantFinalPriceWithClient } from "@/lib/plants/update-plant-final-price";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updatePlantFinalPriceSchema = z.object({
  plantId: z.string().uuid(),
  finalPrice: z.coerce.number().positive("Final price must be greater than zero."),
});

export type UpdatePlantFinalPriceActionResult = Awaited<
  ReturnType<typeof updatePlantFinalPriceWithClient>
>;

export async function updatePlantFinalPriceAction(
  plantId: string,
  finalPrice: number,
): Promise<UpdatePlantFinalPriceActionResult> {
  const parsed = updatePlantFinalPriceSchema.safeParse({ plantId, finalPrice });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or final price." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updatePlantFinalPriceWithClient(
    supabase,
    parsed.data.plantId,
    parsed.data.finalPrice,
  );

  if (result.success) {
    revalidatePath("/app");
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
    revalidatePath(`/hh/case/${parsed.data.plantId}`);
  }

  return result;
}
