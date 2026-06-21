"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setBugsFoundWithClient } from "@/lib/plants/set-bugs-found";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const setBugsFoundSchema = z.object({
  plantId: z.string().uuid(),
  bugsFound: z.union([z.literal(true), z.literal(false), z.null()]),
});

export type SetBugsFoundActionResult = Awaited<ReturnType<typeof setBugsFoundWithClient>>;

export async function setBugsFoundAction(
  plantId: string,
  bugsFound: boolean | null,
): Promise<SetBugsFoundActionResult> {
  const parsed = setBugsFoundSchema.safeParse({ plantId, bugsFound });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or bugs flag." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await setBugsFoundWithClient(supabase, parsed.data.plantId, parsed.data.bugsFound);

  if (result.success) {
    revalidatePath("/app");
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
    revalidatePath(`/hh/case/${parsed.data.plantId}`);
  }

  return result;
}
