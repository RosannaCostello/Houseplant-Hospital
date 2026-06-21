import type { PlantStatus } from "@/lib/plant-status";
import { PLANT_STATUSES } from "@/lib/plant-status";
import { signPhotoPaths } from "@/lib/photos/sign-photo-urls";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { visitPlantPositionFromOrderedIds } from "@/lib/visits/visit-plant-position";

export type PlantDetailPhoto = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  createdAt: string;
};

export type PlantDetail = {
  id: string;
  name: string | null;
  species: string | null;
  size: string;
  status: PlantStatus;
  bugsFound: boolean | null;
  finalPrice: number | null;
  collectedAt: string | null;
  checkedInAt: string;
  visitId: string;
  visitPlantIndex: number;
  visitPlantTotal: number;
  visitNotes: string | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  photos: PlantDetailPhoto[];
  treatmentNote: string | null;
  careTip: string | null;
};

type PlantPhotoRow = {
  id: string;
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

const PLANT_DETAIL_RELATIONS = `
      visits!inner (
        id,
        checkin_date,
        notes,
        customers!inner (
          first_name,
          last_name,
          email,
          phone
        )
      ),
      plant_photos (
        id,
        storage_path,
        thumbnail_path,
        created_at
      ),
      treatment_notes (
        content,
        created_at
      ),
      care_tips (
        content,
        created_at
      )
`;

const PLANT_DETAIL_SELECT = `
      id,
      name,
      species,
      size,
      status,
      bugs_found,
      final_price,
      collected_at,
      created_at,
      ${PLANT_DETAIL_RELATIONS}
`;

const PLANT_DETAIL_SELECT_LEGACY = `
      id,
      name,
      species,
      size,
      status,
      bugs_found,
      created_at,
      ${PLANT_DETAIL_RELATIONS}
`;

function isMissingCollectionColumnsError(message: string): boolean {
  return message.includes("final_price") || message.includes("collected_at");
}

export async function getPlantDetail(plantId: string): Promise<PlantDetail | null> {
  const supabase = await createSupabaseServerClient();

  let { data, error } = await supabase
    .from("plants")
    .select(PLANT_DETAIL_SELECT)
    .eq("id", plantId)
    .maybeSingle();

  if (error && isMissingCollectionColumnsError(error.message)) {
    ({ data, error } = await supabase
      .from("plants")
      .select(PLANT_DETAIL_SELECT_LEGACY)
      .eq("id", plantId)
      .maybeSingle());
  }

  if (error) {
    throw new Error(`Failed to load plant: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as {
    id?: string;
    name?: string | null;
    species?: string | null;
    size?: string;
    status?: string;
    bugs_found?: boolean;
    final_price?: number | null;
    collected_at?: string | null;
    visits?:
      | {
          id: string;
          checkin_date: string;
          notes: string | null;
          customers:
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
        }
      | Array<{
          id: string;
          checkin_date: string;
          notes: string | null;
          customers:
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
        }>;
    plant_photos?: PlantPhotoRow[] | null;
    treatment_notes?:
      | Array<{
          content: string;
          created_at: string;
        }>
      | null;
    care_tips?:
      | Array<{
          content: string;
          created_at: string;
        }>
      | null;
  };

  const visit = unwrapRelation(row.visits);
  const customer = visit ? unwrapRelation(visit.customers) : null;

  if (!row.id || !row.size || !row.status || !visit || !customer) {
    return null;
  }

  if (!isPlantStatus(row.status)) {
    return null;
  }

  const photoRows = [...(row.plant_photos ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const paths = [
    ...new Set(
      photoRows.flatMap((photo) => [photo.storage_path, photo.thumbnail_path].filter(Boolean) as string[]),
    ),
  ];

  const signedUrls = await signPhotoPaths(paths);

  const photos: PlantDetailPhoto[] = photoRows
    .map((photo) => {
      const url = signedUrls.get(photo.storage_path);

      if (!url) return null;

      const thumbPath = photo.thumbnail_path;
      const thumbnailUrl = thumbPath ? (signedUrls.get(thumbPath) ?? null) : null;

      return {
        id: photo.id,
        url,
        thumbnailUrl,
        createdAt: photo.created_at,
      };
    })
    .filter((photo): photo is PlantDetailPhoto => photo !== null);

  const latestTreatmentNote = [...(row.treatment_notes ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
  const latestCareTip = [...(row.care_tips ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  const { data: visitPlants, error: visitPlantsError } = await supabase
    .from("plants")
    .select("id")
    .eq("visit_id", visit.id)
    .order("created_at", { ascending: true });

  if (visitPlantsError) {
    throw new Error(`Failed to load visit plants: ${visitPlantsError.message}`);
  }

  const visitPlantPosition = visitPlantPositionFromOrderedIds(
    row.id,
    (visitPlants ?? []).map((plant) => plant.id),
  );

  return {
    id: row.id,
    name: row.name ?? null,
    species: row.species ?? null,
    size: row.size,
    status: row.status,
    bugsFound: row.bugs_found ?? null,
    finalPrice: row.final_price != null ? Number(row.final_price) : null,
    collectedAt: row.collected_at ?? null,
    checkedInAt: visit.checkin_date,
    visitId: visit.id,
    visitPlantIndex: visitPlantPosition.index,
    visitPlantTotal: visitPlantPosition.total,
    visitNotes: visit.notes,
    customer: {
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
    },
    photos,
    treatmentNote: latestTreatmentNote?.content ?? null,
    careTip: latestCareTip?.content ?? null,
  };
}
