import type { SupabaseClient } from "@supabase/supabase-js";
import { dataUrlToUint8Array, mimeTypeToExtension } from "@/lib/photos/data-url";

const PLANT_PHOTOS_BUCKET = "plant-photos";

type UploadDraftPhotoInput = {
  draftId: string;
  plantClientId: string;
  mimeType: "image/webp" | "image/jpeg";
  dataUrl: string;
  thumbnailDataUrl: string;
  byteSize: number;
  width: number;
  height: number;
};

function draftPhotoPaths(draftId: string, plantClientId: string, extension: string) {
  const base = `drafts/${draftId}/${plantClientId}`;
  return {
    storagePath: `${base}/check-in.${extension}`,
    thumbnailPath: `${base}/thumb.${extension}`,
  };
}

export async function uploadCheckInDraftPhotoWithClient(
  supabase: SupabaseClient,
  input: UploadDraftPhotoInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const extension = mimeTypeToExtension(input.mimeType);
  const { storagePath, thumbnailPath } = draftPhotoPaths(
    input.draftId,
    input.plantClientId,
    extension,
  );

  const { data: existing, error: existingError } = await supabase
    .from("check_in_draft_photos")
    .select("storage_path, thumbnail_path")
    .eq("draft_id", input.draftId)
    .eq("plant_client_id", input.plantClientId)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (existing) {
    await supabase.storage
      .from(PLANT_PHOTOS_BUCKET)
      .remove([existing.storage_path, existing.thumbnail_path]);
  }

  const fullBytes = dataUrlToUint8Array(input.dataUrl);
  const thumbBytes = dataUrlToUint8Array(input.thumbnailDataUrl);

  const { error: fullError } = await supabase.storage
    .from(PLANT_PHOTOS_BUCKET)
    .upload(storagePath, fullBytes, {
      contentType: input.mimeType,
      upsert: true,
    });

  if (fullError) {
    return { success: false, error: `Failed to upload photo: ${fullError.message}` };
  }

  const { error: thumbError } = await supabase.storage
    .from(PLANT_PHOTOS_BUCKET)
    .upload(thumbnailPath, thumbBytes, {
      contentType: input.mimeType,
      upsert: true,
    });

  if (thumbError) {
    await supabase.storage.from(PLANT_PHOTOS_BUCKET).remove([storagePath]);
    return { success: false, error: `Failed to upload thumbnail: ${thumbError.message}` };
  }

  const { error: upsertError } = await supabase.from("check_in_draft_photos").upsert(
    {
      draft_id: input.draftId,
      plant_client_id: input.plantClientId,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      mime_type: input.mimeType,
      byte_size: input.byteSize,
      width: input.width,
      height: input.height,
    },
    { onConflict: "draft_id,plant_client_id" },
  );

  if (upsertError) {
    await supabase.storage.from(PLANT_PHOTOS_BUCKET).remove([storagePath, thumbnailPath]);
    return { success: false, error: upsertError.message };
  }

  return { success: true };
}

export async function deleteCheckInDraftPhotoWithClient(
  supabase: SupabaseClient,
  draftId: string,
  plantClientId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const { data: existing, error: lookupError } = await supabase
    .from("check_in_draft_photos")
    .select("storage_path, thumbnail_path")
    .eq("draft_id", draftId)
    .eq("plant_client_id", plantClientId)
    .maybeSingle();

  if (lookupError) {
    return { success: false, error: lookupError.message };
  }

  if (!existing) {
    return { success: true };
  }

  await supabase.storage
    .from(PLANT_PHOTOS_BUCKET)
    .remove([existing.storage_path, existing.thumbnail_path]);

  const { error } = await supabase
    .from("check_in_draft_photos")
    .delete()
    .eq("draft_id", draftId)
    .eq("plant_client_id", plantClientId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function copyDraftPhotoToPlant(
  supabase: SupabaseClient,
  fromStoragePath: string,
  fromThumbnailPath: string,
  plantId: string,
  mimeType: "image/webp" | "image/jpeg",
): Promise<{ storagePath: string; thumbnailPath: string }> {
  const extension = mimeTypeToExtension(mimeType);
  const storagePath = `${plantId}/check-in.${extension}`;
  const thumbnailPath = `${plantId}/thumb.${extension}`;

  const { error: copyError } = await supabase.storage
    .from(PLANT_PHOTOS_BUCKET)
    .copy(fromStoragePath, storagePath);

  if (copyError) {
    throw new Error(`Failed to copy photo: ${copyError.message}`);
  }

  const { error: thumbCopyError } = await supabase.storage
    .from(PLANT_PHOTOS_BUCKET)
    .copy(fromThumbnailPath, thumbnailPath);

  if (thumbCopyError) {
    await supabase.storage.from(PLANT_PHOTOS_BUCKET).remove([storagePath]);
    throw new Error(`Failed to copy thumbnail: ${thumbCopyError.message}`);
  }

  return { storagePath, thumbnailPath };
}
