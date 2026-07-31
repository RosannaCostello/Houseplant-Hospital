"use server";

import { z } from "zod";
import { saveCareTipWithClient } from "@/lib/plants/save-care-tip";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const saveCareTipSchema = z.object({
  plantId: z.string().uuid(),
  content: z.string(),
});

export type SaveCareTipActionResult = Awaited<ReturnType<typeof saveCareTipWithClient>>;

export async function saveCareTipAction(
  plantId: string,
  content: string,
): Promise<SaveCareTipActionResult> {
  const parsed = saveCareTipSchema.safeParse({ plantId, content });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or care tip." };
  }

  const supabase = await createSupabaseServerClient();
  return saveCareTipWithClient(supabase, parsed.data.plantId, parsed.data.content);
}
