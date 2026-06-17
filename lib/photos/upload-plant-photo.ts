import type { SupabaseClient } from "@supabase/supabase-js";
import { dataUrlToUint8Array, mimeTypeToExtension } from "@/lib/photos/data-url";

const PLANT_PHOTOS_BUCKET = "plant-photos";

type UploadPlantPhotoInput = {
  plantId: string;
  mimeType: "image/webp" | "image/jpeg";
  dataUrl: string;
  thumbnailDataUrl: string;
};

export type UploadedPlantPhoto = {
  storagePath: string;
  thumbnailPath: string;
};

export async function uploadPlantPhoto(
  supabase: SupabaseClient,
  input: UploadPlantPhotoInput,
): Promise<UploadedPlantPhoto> {
  const extension = mimeTypeToExtension(input.mimeType);
  const storagePath = `${input.plantId}/check-in.${extension}`;
  const thumbnailPath = `${input.plantId}/thumb.${extension}`;

  const fullBytes = dataUrlToUint8Array(input.dataUrl);
  const thumbBytes = dataUrlToUint8Array(input.thumbnailDataUrl);

  const { error: fullError } = await supabase.storage
    .from(PLANT_PHOTOS_BUCKET)
    .upload(storagePath, fullBytes, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (fullError) {
    throw new Error(`Failed to upload photo: ${fullError.message}`);
  }

  const { error: thumbError } = await supabase.storage
    .from(PLANT_PHOTOS_BUCKET)
    .upload(thumbnailPath, thumbBytes, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (thumbError) {
    await supabase.storage.from(PLANT_PHOTOS_BUCKET).remove([storagePath]);
    throw new Error(`Failed to upload thumbnail: ${thumbError.message}`);
  }

  const { error: insertError } = await supabase.from("plant_photos").insert({
    plant_id: input.plantId,
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
  });

  if (insertError) {
    await supabase.storage.from(PLANT_PHOTOS_BUCKET).remove([storagePath, thumbnailPath]);
    throw new Error(`Failed to save photo record: ${insertError.message}`);
  }

  return { storagePath, thumbnailPath };
}

export async function removePlantPhotoFiles(
  supabase: SupabaseClient,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(PLANT_PHOTOS_BUCKET).remove(paths);
}
