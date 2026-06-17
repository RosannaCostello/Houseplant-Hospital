"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addTreatmentNoteWithClient } from "@/lib/plants/add-treatment-note";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const addTreatmentNoteSchema = z.object({
  plantId: z.string().uuid(),
  content: z.string(),
});

export type AddTreatmentNoteActionResult = Awaited<ReturnType<typeof addTreatmentNoteWithClient>>;

export async function addTreatmentNoteAction(
  plantId: string,
  content: string,
): Promise<AddTreatmentNoteActionResult> {
  const parsed = addTreatmentNoteSchema.safeParse({ plantId, content });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or note." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await addTreatmentNoteWithClient(
    supabase,
    parsed.data.plantId,
    parsed.data.content,
  );

  if (result.success) {
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
  }

  return result;
}
