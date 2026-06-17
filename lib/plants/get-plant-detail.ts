import type { PlantStatus } from "@/lib/plant-status";
import { PLANT_STATUSES } from "@/lib/plant-status";
import { signPhotoPaths } from "@/lib/photos/sign-photo-urls";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlantDetailPhoto = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  createdAt: string;
};

export type PlantDetailTreatmentNote = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string | null;
};

export type PlantDetailCareTip = {
  id: string;
  content: string;
  createdAt: string;
};

export type PlantDetail = {
  id: string;
  name: string | null;
  species: string | null;
  size: string;
  status: PlantStatus;
  bugsFound: boolean;
  finalPrice: number | null;
  collectedAt: string | null;
  checkedInAt: string;
  visitId: string;
  visitNotes: string | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  photos: PlantDetailPhoto[];
  treatmentNotes: PlantDetailTreatmentNote[];
  careTips: PlantDetailCareTip[];
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

export async function getPlantDetail(plantId: string): Promise<PlantDetail | null> {
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
      final_price,
      collected_at,
      created_at,
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
        id,
        content,
        created_at,
        profiles (
          name
        )
      ),
      care_tips (
        id,
        content,
        created_at
      )
    `,
    )
    .eq("id", plantId)
    .maybeSingle();

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
          id: string;
          content: string;
          created_at: string;
          profiles: { name: string | null } | Array<{ name: string | null }> | null;
        }>
      | null;
    care_tips?:
      | Array<{
          id: string;
          content: string;
          created_at: string;
        }>
      | null;
  };

  const visit = unwrapRelation(row.visits);
  const customer = visit ? unwrapRelation(visit.customers) : null;

  if (!row.id || !row.size || !row.status || row.bugs_found == null || !visit || !customer) {
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

  const treatmentNotes: PlantDetailTreatmentNote[] = [...(row.treatment_notes ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((note) => {
      const author = unwrapRelation(note.profiles);

      return {
        id: note.id,
        content: note.content,
        createdAt: note.created_at,
        authorName: author?.name ?? null,
      };
    });

  const careTips: PlantDetailCareTip[] = [...(row.care_tips ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((tip) => ({
      id: tip.id,
      content: tip.content,
      createdAt: tip.created_at,
    }));

  return {
    id: row.id,
    name: row.name ?? null,
    species: row.species ?? null,
    size: row.size,
    status: row.status,
    bugsFound: row.bugs_found,
    finalPrice: row.final_price != null ? Number(row.final_price) : null,
    collectedAt: row.collected_at ?? null,
    checkedInAt: visit.checkin_date,
    visitId: visit.id,
    visitNotes: visit.notes,
    customer: {
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
    },
    photos,
    treatmentNotes,
    careTips,
  };
}
