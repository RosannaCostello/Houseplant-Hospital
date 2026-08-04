import { customerPlantStatus } from "@/lib/plants/customer-status";
import type { PlantStatus } from "@/lib/plant-status";
import { PLANT_STATUSES } from "@/lib/plant-status";
import { signPhotoPaths } from "@/lib/photos/sign-photo-urls";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PublicPlantCase = {
  id: string;
  name: string | null;
  species: string | null;
  status: PlantStatus;
  statusLabel: string;
  statusMessage: string;
  checkedInAt: string;
  photoUrl: string | null;
};

function isPlantStatus(value: string): value is PlantStatus {
  return (PLANT_STATUSES as readonly string[]).includes(value);
}

export async function getPublicPlantCase(plantId: string): Promise<PublicPlantCase | null> {
  // Service role only to call the narrowed SECURITY DEFINER RPC + sign storage.
  // The RPC returns public-safe columns only (no customer PII).
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc("get_public_plant_case", {
    p_plant_id: plantId,
  });

  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;

    if (!row || typeof row !== "object") {
      return null;
    }

    const record = row as {
      id?: string;
      name?: string | null;
      species?: string | null;
      status?: string;
      checkin_date?: string;
      photo_storage_path?: string | null;
    };

    if (!record.id || !record.status || !record.checkin_date || !isPlantStatus(record.status)) {
      return null;
    }

    const photoPath = record.photo_storage_path ?? null;
    const signedUrls = photoPath ? await signPhotoPaths([photoPath], supabase) : new Map();
    const customerStatus = customerPlantStatus(record.status);

    return {
      id: record.id,
      name: record.name ?? null,
      species: record.species ?? null,
      status: record.status,
      statusLabel: customerStatus.label,
      statusMessage: customerStatus.message,
      checkedInAt: record.checkin_date,
      photoUrl: photoPath ? (signedUrls.get(photoPath) ?? null) : null,
    };
  }

  // Fallback before migration 0022 — still filter fields in TS.
  const { data: legacy, error: legacyError } = await supabase
    .from("plants")
    .select(
      `
      id,
      name,
      species,
      status,
      visits!inner (
        checkin_date
      ),
      plant_photos (
        storage_path,
        created_at
      )
    `,
    )
    .eq("id", plantId)
    .maybeSingle();

  if (legacyError) {
    throw new Error(`Failed to load plant case: ${legacyError.message}`);
  }

  if (!legacy || typeof legacy !== "object") {
    return null;
  }

  const visits = (legacy as { visits?: { checkin_date: string } | Array<{ checkin_date: string }> })
    .visits;
  const visit = Array.isArray(visits) ? visits[0] : visits;
  const status = (legacy as { status?: string }).status;
  const id = (legacy as { id?: string }).id;
  const photos = (legacy as { plant_photos?: Array<{ storage_path: string; created_at: string }> })
    .plant_photos;

  if (!id || !status || !visit || !isPlantStatus(status)) {
    return null;
  }

  const photoPath =
    photos && photos.length > 0
      ? [...photos].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0]?.storage_path ?? null
      : null;
  const signedUrls = photoPath ? await signPhotoPaths([photoPath], supabase) : new Map();
  const customerStatus = customerPlantStatus(status);

  return {
    id,
    name: (legacy as { name?: string | null }).name ?? null,
    species: (legacy as { species?: string | null }).species ?? null,
    status,
    statusLabel: customerStatus.label,
    statusMessage: customerStatus.message,
    checkedInAt: visit.checkin_date,
    photoUrl: photoPath ? (signedUrls.get(photoPath) ?? null) : null,
  };
}
