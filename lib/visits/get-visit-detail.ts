import type { PlantStatus } from "@/lib/plant-status";
import { PLANT_STATUSES } from "@/lib/plant-status";
import { signPhotoPaths } from "@/lib/photos/sign-photo-urls";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type VisitDetailPlant = {
  id: string;
  name: string | null;
  species: string | null;
  size: string;
  status: PlantStatus;
  bugsFound: boolean;
  thumbnailUrl: string | null;
};

export type VisitDetail = {
  id: string;
  checkinDate: string;
  notes: string | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  plants: VisitDetailPlant[];
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

  return latest.thumbnail_path ?? latest.storage_path;
}

export async function getVisitDetail(visitId: string): Promise<VisitDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("visits")
    .select(
      `
      id,
      checkin_date,
      notes,
      customers!inner (
        first_name,
        last_name,
        email,
        phone
      ),
      plants (
        id,
        name,
        species,
        size,
        status,
        bugs_found,
        created_at,
        plant_photos (
          storage_path,
          thumbnail_path,
          created_at
        )
      )
    `,
    )
    .eq("id", visitId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load visit: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as {
    id?: string;
    checkin_date?: string;
    notes?: string | null;
    customers?:
      | {
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
        }
      | Array<{
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
        }>;
    plants?:
      | Array<{
          id: string;
          name: string | null;
          species: string | null;
          size: string;
          status: string;
          bugs_found: boolean;
          created_at: string;
          plant_photos: PlantPhotoRow[] | null;
        }>
      | null;
  };

  const customer = unwrapRelation(row.customers);

  if (!row.id || !row.checkin_date || !customer) {
    return null;
  }

  const plantRows = [...(row.plants ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const photoPaths = [
    ...new Set(
      plantRows
        .map((plant) => latestPhotoPath(plant.plant_photos))
        .filter((path): path is string => Boolean(path)),
    ),
  ];

  const signedUrls = await signPhotoPaths(photoPaths);

  const plants: VisitDetailPlant[] = [];

  for (const plant of plantRows) {
    if (!isPlantStatus(plant.status)) continue;

    const photoPath = latestPhotoPath(plant.plant_photos);

    plants.push({
      id: plant.id,
      name: plant.name,
      species: plant.species,
      size: plant.size,
      status: plant.status,
      bugsFound: plant.bugs_found,
      thumbnailUrl: photoPath ? (signedUrls.get(photoPath) ?? null) : null,
    });
  }

  return {
    id: row.id,
    checkinDate: row.checkin_date,
    notes: row.notes ?? null,
    customer: {
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
    },
    plants,
  };
}
