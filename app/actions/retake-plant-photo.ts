"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { retakePlantPhotoWithClient } from "@/lib/plants/retake-plant-photo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  plantId: z.string().uuid(),
  mimeType: z.union([z.literal("image/webp"), z.literal("image/jpeg")]),
  dataUrl: z.string().min(1),
  thumbnailDataUrl: z.string().min(1),
});

export type RetakePlantPhotoActionResult = Awaited<
  ReturnType<typeof retakePlantPhotoWithClient>
>;

export async function retakePlantPhotoAction(
  input: z.infer<typeof schema>,
): Promise<RetakePlantPhotoActionResult> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid photo upload." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await retakePlantPhotoWithClient(supabase, parsed.data);

  if (result.success) {
    revalidatePath("/app");
    revalidatePath(`/app/plants/${parsed.data.plantId}`);
    revalidatePath(`/hh/case/${parsed.data.plantId}`);
  }

  return result;
}
