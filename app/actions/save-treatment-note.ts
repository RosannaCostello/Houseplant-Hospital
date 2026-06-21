"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveTreatmentNoteWithClient } from "@/lib/plants/save-treatment-note";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const saveTreatmentNoteSchema = z.object({
  plantId: z.string().uuid(),
  content: z.string(),
});

export type SaveTreatmentNoteActionResult = Awaited<ReturnType<typeof saveTreatmentNoteWithClient>>;

export async function saveTreatmentNoteAction(
  plantId: string,
  content: string,
): Promise<SaveTreatmentNoteActionResult> {
  const parsed = saveTreatmentNoteSchema.safeParse({ plantId, content });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or note." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await saveTreatmentNoteWithClient(
    supabase,
    parsed.data.plantId,
    parsed.data.content,
  );

  if (result.success) {
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
  }

  return result;
}
