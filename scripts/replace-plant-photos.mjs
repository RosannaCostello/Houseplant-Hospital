/**
 * One-off local helper: replace dashboard placeholder plant photos.
 * Usage: node scripts/replace-plant-photos.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DOWNLOADS = "/Users/jackchalkley/Downloads";
const BUCKET = "plant-photos";

const REPLACEMENTS = [
  { plantId: "acbde57e-76ca-402e-afb3-b3b332a5721e", file: "plant1.jpg" },
  { plantId: "8fa736e1-79cf-40b3-ba52-74723682302f", file: "plant2.jpg" },
  { plantId: "74590fda-16c4-4b1d-be60-376173c81df8", file: "plant3.avif" },
  { plantId: "ff68030b-dad9-4a85-a7ed-72f9cd198e72", file: "plant4.webp" },
  { plantId: "c91b5eb9-1bad-43e5-8b00-751b88a81bc1", file: "plant5.jpeg" },
  { plantId: "424b6126-fff1-4aac-a6d5-372b2f77343d", file: "plant6.jpeg" },
  { plantId: "a14d66bc-f19a-4627-8291-b316a54169b6", file: "plant7.webp" },
  { plantId: "d7d6d56e-f763-418c-99e4-965044bda346", file: "plant8.jpg" },
];

function loadEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  const text = readFileSync(envPath, "utf8");
  const env = {};

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }

  return env;
}

function sipsConvert(inputPath, outputPath, extraArgs = []) {
  execFileSync("sips", ["-s", "format", "jpeg", ...extraArgs, inputPath, "--out", outputPath], {
    stdio: "pipe",
  });
}

function prepareImages(sourcePath, workDir) {
  const base = basename(sourcePath, sourcePath.slice(sourcePath.lastIndexOf(".")));
  const normalized = join(workDir, `${base}-normalized.jpg`);
  const full = join(workDir, `${base}-full.jpg`);
  const thumb = join(workDir, `${base}-thumb.jpg`);

  sipsConvert(sourcePath, normalized);
  sipsConvert(normalized, full, ["-Z", "1600"]);
  sipsConvert(normalized, thumb, ["-Z", "320"]);

  return {
    fullBytes: readFileSync(full),
    thumbBytes: readFileSync(thumb),
  };
}

async function replacePlantPhoto(supabase, plantId, sourcePath) {
  const workDir = mkdtempSync(join(tmpdir(), "hilda-photos-"));

  try {
    const { fullBytes, thumbBytes } = prepareImages(sourcePath, workDir);
    const storagePath = `${plantId}/check-in.jpg`;
    const thumbnailPath = `${plantId}/thumb.jpg`;

    const { data: existingPhotos, error: fetchError } = await supabase
      .from("plant_photos")
      .select("id, storage_path, thumbnail_path")
      .eq("plant_id", plantId);

    if (fetchError) {
      throw new Error(`Failed to load existing photos for ${plantId}: ${fetchError.message}`);
    }

    const oldPaths = new Set();

    for (const photo of existingPhotos ?? []) {
      if (photo.storage_path) oldPaths.add(photo.storage_path);
      if (photo.thumbnail_path) oldPaths.add(photo.thumbnail_path);
    }

    if (oldPaths.size > 0) {
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([...oldPaths]);

      if (removeError) {
        throw new Error(`Failed to remove old storage for ${plantId}: ${removeError.message}`);
      }
    }

    if ((existingPhotos ?? []).length > 0) {
      const { error: deleteError } = await supabase
        .from("plant_photos")
        .delete()
        .eq("plant_id", plantId);

      if (deleteError) {
        throw new Error(`Failed to delete old photo rows for ${plantId}: ${deleteError.message}`);
      }
    }

    const { error: fullError } = await supabase.storage.from(BUCKET).upload(storagePath, fullBytes, {
      contentType: "image/jpeg",
      upsert: true,
    });

    if (fullError) {
      throw new Error(`Failed to upload full photo for ${plantId}: ${fullError.message}`);
    }

    const { error: thumbError } = await supabase.storage.from(BUCKET).upload(thumbnailPath, thumbBytes, {
      contentType: "image/jpeg",
      upsert: true,
    });

    if (thumbError) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw new Error(`Failed to upload thumbnail for ${plantId}: ${thumbError.message}`);
    }

    const { error: insertError } = await supabase.from("plant_photos").insert({
      plant_id: plantId,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
    });

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([storagePath, thumbnailPath]);
      throw new Error(`Failed to insert photo row for ${plantId}: ${insertError.message}`);
    }

    console.log(`✓ ${plantId} ← ${basename(sourcePath)}`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const { plantId, file } of REPLACEMENTS) {
    const sourcePath = join(DOWNLOADS, file);
    await replacePlantPhoto(supabase, plantId, sourcePath);
  }

  console.log("\nDone — refresh the dashboard to see updated thumbnails.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
