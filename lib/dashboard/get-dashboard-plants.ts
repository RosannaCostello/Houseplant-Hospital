import { signPhotoPaths } from "@/lib/photos/sign-photo-urls";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PLANT_STATUSES, type PlantStatus } from "@/lib/plant-status";
import type { DashboardPlant } from "@/lib/dashboard/types";

type PlantPhotoRow = {
  storage_path: string;
  thumbnail_path: string | null;
  created_at: string;
};

type DashboardPlantRow = {
  id: string;
  name: string | null;
  species: string | null;
  size: string;
  status: string;
  bugs_found: boolean;
  created_at: string;
  visits: {
    checkin_date: string;
    customers: {
      last_name: string;
    };
  };
  plant_photos: PlantPhotoRow[] | null;
};

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseDashboardPlantRow(raw: unknown): DashboardPlantRow | null {
  if (!raw || typeof raw !== "object") return null;

  const row = raw as {
    id?: string;
    name?: string | null;
    species?: string | null;
    size?: string;
    status?: string;
    bugs_found?: boolean;
    created_at?: string;
    visits?:
      | {
          checkin_date: string;
          customers: { last_name: string } | { last_name: string }[];
        }
      | Array<{
          checkin_date: string;
          customers: { last_name: string } | { last_name: string }[];
        }>;
    plant_photos?: PlantPhotoRow[] | null;
  };

  const visit = unwrapRelation(row.visits);
  const customer = visit ? unwrapRelation(visit.customers) : null;

  if (!row.id || !row.size || !row.status || row.bugs_found == null || !visit || !customer) {
    return null;
  }

  return {
    id: row.id,
    name: row.name ?? null,
    species: row.species ?? null,
    size: row.size,
    status: row.status,
    bugs_found: row.bugs_found,
    created_at: row.created_at ?? visit.checkin_date,
    visits: {
      checkin_date: visit.checkin_date,
      customers: { last_name: customer.last_name },
    },
    plant_photos: row.plant_photos ?? null,
  };
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

export async function getDashboardPlants(): Promise<DashboardPlant[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("plants")
    .select(
      `
      id,
      name,
      species,
      size,
      status,
      bugs_found,
      created_at,
      visits!inner (
        checkin_date,
        customers!inner (
          last_name
        )
      ),
      plant_photos (
        storage_path,
        thumbnail_path,
        created_at
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load dashboard plants: ${error.message}`);
  }

  const rows = (data ?? [])
    .map(parseDashboardPlantRow)
    .filter((row): row is DashboardPlantRow => row !== null);
  const photoPaths = [
    ...new Set(
      rows
        .map((row) => latestPhotoPath(row.plant_photos))
        .filter((path): path is string => Boolean(path)),
    ),
  ];

  const signedUrls = await signPhotoPaths(photoPaths);

  const plants: DashboardPlant[] = [];

  for (const row of rows) {
    if (!isPlantStatus(row.status)) continue;

    const photoPath = latestPhotoPath(row.plant_photos);

    plants.push({
      id: row.id,
      status: row.status,
      customerSurname: row.visits.customers.last_name,
      name: row.name,
      species: row.species,
      size: row.size,
      bugsFound: row.bugs_found,
      checkedInAt: row.visits.checkin_date,
      thumbnailUrl: photoPath ? (signedUrls.get(photoPath) ?? null) : null,
    });
  }

  return plants;
}
