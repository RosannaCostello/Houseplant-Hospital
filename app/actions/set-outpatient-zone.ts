"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toStaffErrorMessage } from "@/lib/errors/staff-error";
import { setOutpatientZoneWithClient } from "@/lib/plants/set-outpatient-zone";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const setOutpatientZoneSchema = z.object({
  plantId: z.string().uuid(),
  outpatientZoneId: z.string().uuid(),
});

export type SetOutpatientZoneActionResult = Awaited<
  ReturnType<typeof setOutpatientZoneWithClient>
>;

export async function setOutpatientZoneAction(
  plantId: string,
  outpatientZoneId: string,
): Promise<SetOutpatientZoneActionResult> {
  const parsed = setOutpatientZoneSchema.safeParse({ plantId, outpatientZoneId });

  if (!parsed.success) {
    return { success: false, error: "Invalid plant or zone." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const result = await setOutpatientZoneWithClient(
      supabase,
      parsed.data.plantId,
      parsed.data.outpatientZoneId,
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
    console.error("[setOutpatientZoneAction]", error);
    return { success: false, error: toStaffErrorMessage(error) };
  }
}
