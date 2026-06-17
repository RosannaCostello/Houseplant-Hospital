"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addCareTipWithClient } from "@/lib/plants/add-care-tip";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const addCareTipSchema = z.object({
  plantId: z.string().uuid(),
  content: z.string(),
});

export type AddCareTipActionResult = Awaited<ReturnType<typeof addCareTipWithClient>>;

export async function addCareTipAction(
  plantId: string,
  content: string,
): Promise<AddCareTipActionResult> {
  const parsed = addCareTipSchema.safeParse({ plantId, content });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or care tip." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await addCareTipWithClient(supabase, parsed.data.plantId, parsed.data.content);

  if (result.success) {
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
  }

  return result;
}
