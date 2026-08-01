"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  setPestTreatmentWithClient,
  type PestTreatmentNumber,
} from "@/lib/plants/pest-treatments";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  plantId: z.string().uuid(),
  treatmentNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  completed: z.boolean(),
});

export type SetPestTreatmentActionResult = Awaited<
  ReturnType<typeof setPestTreatmentWithClient>
>;

export async function setPestTreatmentAction(
  plantId: string,
  treatmentNumber: PestTreatmentNumber,
  completed: boolean,
): Promise<SetPestTreatmentActionResult> {
  const parsed = schema.safeParse({ plantId, treatmentNumber, completed });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or treatment." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await setPestTreatmentWithClient(
    supabase,
    parsed.data.plantId,
    parsed.data.treatmentNumber,
    parsed.data.completed,
  );

  if (result.success) {
    revalidatePath("/app");
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
    revalidatePath(`/hh/case/${parsed.data.plantId}`);
  }

  return result;
}
