"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toStaffErrorMessage } from "@/lib/errors/staff-error";
import { setPestTypeWithClient } from "@/lib/plants/set-pest-type";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const setPestTypeSchema = z.object({
  plantId: z.string().uuid(),
  pestTypeOptionId: z.string().uuid().nullable(),
});

export type SetPestTypeActionResult = Awaited<ReturnType<typeof setPestTypeWithClient>>;

export async function setPestTypeAction(
  plantId: string,
  pestTypeOptionId: string | null,
): Promise<SetPestTypeActionResult> {
  const parsed = setPestTypeSchema.safeParse({ plantId, pestTypeOptionId });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or pest type." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const result = await setPestTypeWithClient(
      supabase,
      parsed.data.plantId,
      parsed.data.pestTypeOptionId,
    );

    if (result.success) {
      revalidatePath("/app");
      revalidatePath(`/app/plants/${parsed.data.plantId}`);
      revalidatePath(`/hh/case/${parsed.data.plantId}`);
      return result;
    }

    return {
      ...result,
      error: toStaffErrorMessage(result.error, result.error),
    };
  } catch (error) {
    console.error("[setPestTypeAction]", error);
    return { success: false, error: toStaffErrorMessage(error) };
  }
}
