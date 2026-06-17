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

type PlantPhotoRow = {
  storage_path: string;
  thumbnail_path: string | null;
  created_at: string;
};

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isPlantStatus(value: string): value is PlantStatus {
  return (PLANT_STATUSES as readonly string[]).includes(value);
}

function latestPhotoPath(photos: PlantPhotoRow[] | null | undefined): string | null {
  if (!photos?.length) return null;

  const latest = [...photos].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  return latest.storage_path;
}

export async function getPublicPlantCase(plantId: string): Promise<PublicPlantCase | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
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
        thumbnail_path,
        created_at
      )
    `,
    )
    .eq("id", plantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load plant case: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as {
    id?: string;
    name?: string | null;
    species?: string | null;
    status?: string;
    visits?:
      | { checkin_date: string }
      | Array<{ checkin_date: string }>;
    plant_photos?: PlantPhotoRow[] | null;
  };

  const visit = unwrapRelation(row.visits);

  if (!row.id || !row.status || !visit) {
    return null;
  }

  if (!isPlantStatus(row.status)) {
    return null;
  }

  const photoPath = latestPhotoPath(row.plant_photos);
  const signedUrls = photoPath ? await signPhotoPaths([photoPath], supabase) : new Map();
  const customerStatus = customerPlantStatus(row.status);

  return {
    id: row.id,
    name: row.name ?? null,
    species: row.species ?? null,
    status: row.status,
    statusLabel: customerStatus.label,
    statusMessage: customerStatus.message,
    checkedInAt: visit.checkin_date,
    photoUrl: photoPath ? (signedUrls.get(photoPath) ?? null) : null,
  };
}
