"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  recordPestTreatmentWithClient,
  type PestTreatmentNumber,
} from "@/lib/plants/pest-treatments";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  plantId: z.string().uuid(),
  treatmentNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  optionId: z.string().uuid(),
});

export type RecordPestTreatmentActionResult = Awaited<
  ReturnType<typeof recordPestTreatmentWithClient>
>;

export async function recordPestTreatmentAction(
  plantId: string,
  treatmentNumber: PestTreatmentNumber,
  optionId: string,
): Promise<RecordPestTreatmentActionResult> {
  const parsed = schema.safeParse({ plantId, treatmentNumber, optionId });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or treatment." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await recordPestTreatmentWithClient(
    supabase,
    parsed.data.plantId,
    parsed.data.treatmentNumber,
    parsed.data.optionId,
  );

  if (result.success) {
    revalidatePath("/app");
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
    revalidatePath(`/hh/case/${parsed.data.plantId}`);
  }

  return result;
}
