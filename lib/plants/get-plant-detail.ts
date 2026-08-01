import type { PlantStatus } from "@/lib/plant-status";
import { PLANT_STATUSES } from "@/lib/plant-status";
import { signPhotoPaths } from "@/lib/photos/sign-photo-urls";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { visitPlantPositionFromOrderedIds } from "@/lib/visits/visit-plant-position";
import { isPosPaymentStatus, type PosPaymentStatus } from "@/lib/shopify/pos-checkout-types";
import { isPlantCategory, type PlantCategory } from "@/lib/plant-category";
import type { PestTreatmentNumber, PlantPestTreatment } from "@/lib/plants/pest-treatments";

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
  bugsFoundEver: boolean;
  pestTreatments: PlantPestTreatment[];
  plantCategory: PlantCategory;
  sourcePlantId: string | null;
  hasPropagation: boolean;
  finalPrice: number | null;
  collectedAt: string | null;
  checkedInAt: string;
  visitId: string;
  paymentStatus: PosPaymentStatus | null;
  shopifyOrderId: string | null;
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

function parsePaymentStatus(value: string | null | undefined): PosPaymentStatus | null {
  return value && isPosPaymentStatus(value) ? value : null;
}

const PLANT_DETAIL_RELATIONS_BASE = `
      visits!inner (
        id,
        checkin_date,
        notes,
        payment_status,
        shopify_order_id,
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

const PLANT_DETAIL_RELATIONS = `
      ${PLANT_DETAIL_RELATIONS_BASE},
      plant_pest_treatments (
        treatment_number,
        treated_at
      )
`;

const PLANT_DETAIL_SELECT = `
      id,
      name,
      species,
      size,
      status,
      bugs_found,
      bugs_found_ever,
      plant_category,
      source_plant_id,
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
      plant_category,
      source_plant_id,
      created_at,
      ${PLANT_DETAIL_RELATIONS_BASE}
`;

function isMissingCollectionColumnsError(message: string): boolean {
  return message.includes("final_price") || message.includes("collected_at");
}

function isMissingPestTreatmentSchemaError(message: string): boolean {
  return (
    message.includes("bugs_found_ever") ||
    message.includes("plant_pest_treatments")
  );
}

function parsePestTreatments(
  rows: Array<{ treatment_number?: number; treated_at?: string }> | null | undefined,
): PlantPestTreatment[] {
  if (!rows?.length) return [];

  return rows
    .filter(
      (row): row is { treatment_number: PestTreatmentNumber; treated_at: string } =>
        (row.treatment_number === 1 ||
          row.treatment_number === 2 ||
          row.treatment_number === 3) &&
        typeof row.treated_at === "string",
    )
    .map((row) => ({
      treatmentNumber: row.treatment_number,
      treatedAt: row.treated_at,
    }))
    .sort((a, b) => a.treatmentNumber - b.treatmentNumber);
}

export async function getPlantDetail(plantId: string): Promise<PlantDetail | null> {
  const supabase = await createSupabaseServerClient();

  let { data, error } = await supabase
    .from("plants")
    .select(PLANT_DETAIL_SELECT)
    .eq("id", plantId)
    .maybeSingle();

  if (
    error &&
    (isMissingCollectionColumnsError(error.message) ||
      isMissingPestTreatmentSchemaError(error.message))
  ) {
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
    bugs_found_ever?: boolean;
    plant_category?: string;
    source_plant_id?: string | null;
    final_price?: number | null;
    collected_at?: string | null;
    plant_pest_treatments?: Array<{
      treatment_number?: number;
      treated_at?: string;
    }> | null;
    visits?:
      | {
          id: string;
          checkin_date: string;
          notes: string | null;
          payment_status?: string | null;
          shopify_order_id?: string | null;
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
          payment_status?: string | null;
          shopify_order_id?: string | null;
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
  const paymentStatus = parsePaymentStatus(visit.payment_status);
  const { data: propagationChild, error: propagationChildError } = await supabase
    .from("plants")
    .select("id")
    .eq("source_plant_id", row.id)
    .limit(1)
    .maybeSingle();

  if (propagationChildError) {
    throw new Error(`Failed to load plant propagation: ${propagationChildError.message}`);
  }

  return {
    id: row.id,
    name: row.name ?? null,
    species: row.species ?? null,
    size: row.size,
    status: row.status,
    bugsFound: row.bugs_found ?? null,
    bugsFoundEver: row.bugs_found_ever === true || row.bugs_found === true,
    pestTreatments: parsePestTreatments(row.plant_pest_treatments),
    plantCategory: isPlantCategory(row.plant_category) ? row.plant_category : "standard",
    sourcePlantId: row.source_plant_id ?? null,
    hasPropagation: Boolean(propagationChild),
    finalPrice: row.final_price != null ? Number(row.final_price) : null,
    collectedAt: row.collected_at ?? null,
    checkedInAt: visit.checkin_date,
    visitId: visit.id,
    paymentStatus,
    shopifyOrderId: visit.shopify_order_id ?? null,
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
