"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { collectPlantWithClient } from "@/lib/plants/collect-plant";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const collectPlantSchema = z.object({
  plantId: z.string().uuid(),
  finalPrice: z.coerce.number().positive("Final price must be greater than zero."),
});

export type CollectPlantActionResult = Awaited<ReturnType<typeof collectPlantWithClient>>;

export async function collectPlantAction(
  plantId: string,
  finalPrice: number,
): Promise<CollectPlantActionResult> {
  const parsed = collectPlantSchema.safeParse({ plantId, finalPrice });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or final price." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await collectPlantWithClient(
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
