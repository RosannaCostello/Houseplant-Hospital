import { createSupabaseServerClient } from "@/lib/supabase/server";

const PLANT_PHOTOS_BUCKET = "plant-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function signPhotoPaths(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(PLANT_PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw new Error(`Failed to sign plant photo URLs: ${error.message}`);
  }

  const signed = new Map<string, string>();

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      signed.set(item.path, item.signedUrl);
    }
  }

  return signed;
}
