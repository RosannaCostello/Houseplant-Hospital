"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveInternalNotesWithClient } from "@/lib/plants/save-internal-notes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  plantId: z.string().uuid(),
  content: z.string(),
});

export async function saveInternalNotesAction(plantId: string, content: string) {
  const parsed = schema.safeParse({ plantId, content });
  if (!parsed.success) {
    return { success: false as const, error: "Invalid internal notes." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await saveInternalNotesWithClient(
    supabase,
    parsed.data.plantId,
    parsed.data.content,
  );

  if (result.success) {
    revalidatePath("/app");
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
    revalidatePath(`/hh/case/${parsed.data.plantId}`);
  }

  return result;
}
