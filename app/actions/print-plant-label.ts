"use server";

import { z } from "zod";
import { requestPlantLabelPrint } from "@/lib/printing/request-plant-label-print";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  plantId: z.string().uuid(),
});

export type PrintPlantLabelActionResult = Awaited<ReturnType<typeof requestPlantLabelPrint>>;

export async function printPlantLabelAction(
  plantId: string,
): Promise<PrintPlantLabelActionResult> {
  const parsed = schema.safeParse({ plantId });
  if (!parsed.success) {
    return { success: false, error: "Invalid plant." };
  }

  const supabase = await createSupabaseServerClient();
  return requestPlantLabelPrint(supabase, parsed.data.plantId);
}
