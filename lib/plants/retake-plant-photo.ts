import type { SupabaseClient } from "@supabase/supabase-js";
import { replacePlantPrimaryPhoto } from "@/lib/photos/upload-plant-photo";

export type RetakePlantPhotoInput = {
  plantId: string;
  mimeType: "image/webp" | "image/jpeg";
  dataUrl: string;
  thumbnailDataUrl: string;
};

export type RetakePlantPhotoResult =
  | { success: true }
  | { success: false; error: string };

export async function retakePlantPhotoWithClient(
  supabase: SupabaseClient,
  input: RetakePlantPhotoInput,
): Promise<RetakePlantPhotoResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to retake a photo." };
  }

  const { data: plant, error: fetchError } = await supabase
    .from("plants")
    .select("status")
    .eq("id", input.plantId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!plant) {
    return { success: false, error: "Plant not found." };
  }

  if (plant.status === "collected") {
    return { success: false, error: "Collected plants cannot be edited." };
  }

  try {
    await replacePlantPrimaryPhoto(supabase, {
      plantId: input.plantId,
      mimeType: input.mimeType,
      dataUrl: input.dataUrl,
      thumbnailDataUrl: input.thumbnailDataUrl,
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save photo.";
    return { success: false, error: message };
  }
}
