import { signPhotoPaths } from "@/lib/photos/sign-photo-urls";
import { resolveCollectedAtByPlantIds } from "@/lib/dashboard/get-collected-at";
import { getQuarantineSinceByPlantIds } from "@/lib/dashboard/get-quarantine-since";
import {
  buildVisitPlantsByVisitId,
  formatOutpatientCollectionBadge,
} from "@/lib/dashboard/outpatient-collection-badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PLANT_STATUSES, type PlantStatus } from "@/lib/plant-status";
import type { DashboardPlant } from "@/lib/dashboard/types";
import { buildVisitPlantPositions } from "@/lib/visits/visit-plant-position";
import { isPosPaymentStatus, type PosPaymentStatus } from "@/lib/shopify/pos-checkout-types";
import { isPlantCategory, type PlantCategory } from "@/lib/plant-category";

type PlantPhotoRow = {
  storage_path: string;
  thumbnail_path: string | null;
  created_at: string;
};

type DashboardPlantRow = {
  id: string;
  visit_id: string;
  name: string | null;
  species: string | null;
  size: string;
  status: string;
  bugs_found: boolean | null;
  plant_category: PlantCategory;
  source_plant_id: string | null;
  created_at: string;
  collected_at: string | null;
  visits: {
    checkin_date: string;
    payment_status: string | null;
    shopify_order_id: string | null;
    notes: string | null;
    customers: {
      first_name: string;
      last_name: string;
      email: string;
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
    visit_id?: string;
    name?: string | null;
    species?: string | null;
    size?: string;
    status?: string;
    bugs_found?: boolean;
    plant_category?: string;
    source_plant_id?: string | null;
    created_at?: string;
    collected_at?: string | null;
    visits?:
      | {
          checkin_date: string;
          payment_status?: string | null;
          shopify_order_id?: string | null;
          notes?: string | null;
          customers: { first_name: string; last_name: string; email: string } | { first_name: string; last_name: string; email: string }[];
        }
      | Array<{
          checkin_date: string;
          payment_status?: string | null;
          shopify_order_id?: string | null;
          notes?: string | null;
          customers: { first_name: string; last_name: string; email: string } | { first_name: string; last_name: string; email: string }[];
        }>;
    plant_photos?: PlantPhotoRow[] | null;
  };

  const visit = unwrapRelation(row.visits);
  const customer = visit ? unwrapRelation(visit.customers) : null;

  if (!row.id || !row.visit_id || !row.size || !row.status || !visit || !customer) {
    return null;
  }

  // Historic imports belong in Analytics, not the live ops board.
  if (
    visit.notes === "zoho-import" ||
    visit.notes === "zoho-import-final" ||
    visit.notes === "shopify-import"
  ) {
    return null;
  }

  return {
    id: row.id,
    visit_id: row.visit_id,
    name: row.name ?? null,
    species: row.species ?? null,
    size: row.size,
    status: row.status,
    bugs_found: row.bugs_found ?? null,
    plant_category: isPlantCategory(row.plant_category) ? row.plant_category : "standard",
    source_plant_id: row.source_plant_id ?? null,
    created_at: row.created_at ?? visit.checkin_date,
    collected_at: row.collected_at ?? null,
    visits: {
      checkin_date: visit.checkin_date,
      payment_status: visit.payment_status ?? null,
      shopify_order_id: visit.shopify_order_id ?? null,
      notes: visit.notes ?? null,
      customers: {
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: "email" in customer && typeof customer.email === "string" ? customer.email : "",
      },
    },
    plant_photos: row.plant_photos ?? null,
  };
}

function isPlantStatus(value: string): value is PlantStatus {
  return (PLANT_STATUSES as readonly string[]).includes(value);
}

function parsePaymentStatus(value: string | null): PosPaymentStatus | null {
  return value && isPosPaymentStatus(value) ? value : null;
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

  const initialResult = await supabase
    .from("plants")
    .select(
      `
      id,
      visit_id,
      name,
      species,
      size,
      status,
      bugs_found,
      plant_category,
      source_plant_id,
      created_at,
      collected_at,
      visits!inner (
        checkin_date,
        payment_status,
        shopify_order_id,
        notes,
        customers!inner (
          first_name,
          last_name,
          email
        )
      ),
      plant_photos (
        storage_path,
        thumbnail_path,
        created_at
      )
    `,
    )
    // Do not filter zoho visits in PostgREST: `.not(...eq...)` drops NULL notes
    // (SQL <> semantics). Exclude historic import notes in parseDashboardPlantRow instead.
    .order("created_at", { ascending: false })
    .order("created_at", { ascending: false, foreignTable: "plant_photos" })
    .limit(3, { foreignTable: "plant_photos" });
  let data: unknown[] | null = initialResult.data;
  let error = initialResult.error;

  if (
    error &&
    (error.message.includes("plant_category") ||
      error.message.includes("source_plant_id") ||
      error.message.includes("collected_at"))
  ) {
    ({ data, error } = await supabase
      .from("plants")
      .select(
        `
        id,
        visit_id,
        name,
        species,
        size,
        status,
        bugs_found,
        created_at,
        visits!inner (
          checkin_date,
          payment_status,
          shopify_order_id,
          notes,
          customers!inner (
            first_name,
            last_name,
            email
          )
        ),
        plant_photos (
          storage_path,
          thumbnail_path,
          created_at
        )
      `,
      )
      .order("created_at", { ascending: false }));
  }

  if (error) {
    throw new Error(`Failed to load dashboard plants: ${error.message}`);
  }

  const rows = (data ?? [])
    .map(parseDashboardPlantRow)
    .filter((row): row is DashboardPlantRow => row !== null);

  const visitPlantPositions = buildVisitPlantPositions(rows);
  const visitPlantsByVisitId = buildVisitPlantsByVisitId(rows, isPlantStatus);
  const propagatedSourceIds = new Set(
    rows.map((row) => row.source_plant_id).filter((id): id is string => Boolean(id)),
  );

  const quarantinePlantIds = rows
    .filter((row) => row.status === "quarantine")
    .map((row) => row.id);
  const quarantineSinceByPlantId = await getQuarantineSinceByPlantIds(supabase, quarantinePlantIds);

  // Prefer collected_at from the main query; only hit status_history for gaps.
  const collectedAtByPlantId = new Map<string, string>();
  const missingCollectedAtIds: string[] = [];

  for (const row of rows) {
    if (row.status !== "collected") continue;
    if (row.collected_at) {
      collectedAtByPlantId.set(row.id, row.collected_at);
    } else {
      missingCollectedAtIds.push(row.id);
    }
  }

  if (missingCollectedAtIds.length > 0) {
    const resolved = await resolveCollectedAtByPlantIds(supabase, missingCollectedAtIds);
    for (const [id, at] of resolved) {
      collectedAtByPlantId.set(id, at);
    }
  }

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
    const position = visitPlantPositions.get(row.id) ?? { index: 1, total: 1 };

    const visitPlants = visitPlantsByVisitId.get(row.visit_id) ?? [];
    const collectedAt =
      row.status === "collected" ? (collectedAtByPlantId.get(row.id) ?? null) : null;
    const paymentStatus = parsePaymentStatus(row.visits.payment_status);

    plants.push({
      id: row.id,
      status: row.status,
      customerName: `${row.visits.customers.first_name} ${row.visits.customers.last_name}`,
      customerEmail: row.visits.customers.email,
      name: row.name,
      species: row.species,
      size: row.size,
      bugsFound: row.bugs_found ?? null,
      plantCategory: row.plant_category,
      hasPropagation: propagatedSourceIds.has(row.id),
      checkedInAt: row.visits.checkin_date,
      quarantineSince:
        row.status === "quarantine" ? (quarantineSinceByPlantId.get(row.id) ?? null) : null,
      visitPlantIndex: position.index,
      visitPlantTotal: position.total,
      outpatientCollectionBadge: formatOutpatientCollectionBadge(row.id, row.status, visitPlants),
      collectedAt,
      paymentStatus,
      shopifyOrderId: row.visits.shopify_order_id,
      thumbnailUrl: photoPath ? (signedUrls.get(photoPath) ?? null) : null,
    });
  }

  return plants;
}
