"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveSurgerySignOffWithClient } from "@/lib/staff/save-surgery-sign-off";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  plantId: z.string().uuid(),
  staffId: z.string().uuid().nullable(),
});

export async function saveSurgerySignOffAction(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid surgery sign-off." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await saveSurgerySignOffWithClient(
    supabase,
    parsed.data.plantId,
    parsed.data.staffId,
  );

  if (result.success) {
    revalidatePath("/app");
  }

  return result;
}
