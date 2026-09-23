import { parseCareTip, CARE_TIP_CATEGORY_LABELS, type CareTipCategory } from "@/lib/care-tips/compose-parse";
import { showCustomerAftercare } from "@/lib/plants/customer-aftercare";
import { customerPlantStatus } from "@/lib/plants/customer-status";
import {
  buildPlantMilestoneDatesFromHistory,
  type PlantMilestoneDates,
} from "@/lib/plants/get-plant-milestone-dates";
import type { PlantStatus } from "@/lib/plant-status";
import { PLANT_STATUSES } from "@/lib/plant-status";
import { formatPlantSizeLabel } from "@/lib/plant-size";
import { signPhotoPaths } from "@/lib/photos/sign-photo-urls";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CareCardCareTip = {
  category: CareTipCategory;
  label: string;
  text: string;
};

export type CareCardPlant = {
  id: string;
  species: string | null;
  sizeLabel: string;
  status: PlantStatus;
  statusLabel: string;
  statusMessage: string;
  photoUrl: string | null;
  pestTypeLabel: string | null;
  milestones: PlantMilestoneDates;
  /** Only populated when aftercare is visible for this status. */
  treatmentNote: string | null;
  careTips: CareCardCareTip[];
  showAftercare: boolean;
};

export type PublicCareCard = {
  visitId: string;
  checkedInAt: string;
  plants: CareCardPlant[];
};

function isPlantStatus(value: string): value is PlantStatus {
  return (PLANT_STATUSES as readonly string[]).includes(value);
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function careTipsForCustomer(content: string | null): CareCardCareTip[] {
  const parsed = parseCareTip(content);
  if (parsed.kind === "empty") return [];
  if (parsed.kind === "legacy") {
    const text = parsed.content.trim();
    return text ? [{ category: "water", label: "Care tips", text }] : [];
  }
  return (Object.keys(parsed.selections) as CareTipCategory[])
    .map((category) => {
      const text = parsed.selections[category]?.trim() ?? "";
      if (!text) return null;
      return {
        category,
        label: CARE_TIP_CATEGORY_LABELS[category],
        text,
      };
    })
    .filter((row): row is CareCardCareTip => row != null);
}

/** Resolve visit id for a plant (legacy case URL redirect). */
export async function getVisitIdForPublicPlant(plantId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("plants")
    .select("visit_id")
    .eq("id", plantId)
    .maybeSingle();

  if (error || !data || typeof data.visit_id !== "string") {
    return null;
  }
  return data.visit_id;
}

/**
 * Public Customer Care Card for a whole drop-off.
 * Service role only (server); returns customer-safe fields — no PII, notes gated by status.
 */
export async function getPublicCareCard(visitId: string): Promise<PublicCareCard | null> {
  const supabase = createSupabaseAdminClient();

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("id, checkin_date")
    .eq("id", visitId)
    .maybeSingle();

  if (visitError) {
    throw new Error(`Failed to load care card visit: ${visitError.message}`);
  }

  if (!visit || typeof visit.checkin_date !== "string") {
    return null;
  }

  const { data: plantRows, error: plantsError } = await supabase
    .from("plants")
    .select(
      `
      id,
      species,
      size,
      status,
      bugs_found,
      pest_type_options (
        label
      ),
      plant_photos (
        storage_path,
        created_at
      ),
      treatment_notes (
        content,
        updated_at
      ),
      care_tips (
        content,
        updated_at
      ),
      status_history (
        new_status,
        created_at
      )
    `,
    )
    .eq("visit_id", visitId)
    .order("created_at", { ascending: true });

  if (plantsError) {
    // Soft-fail pest type join if migration not applied yet.
    if (
      plantsError.message.includes("pest_type_options") ||
      plantsError.message.includes("pest_type_option")
    ) {
      return getPublicCareCardWithoutPestType(supabase, visitId, visit.checkin_date);
    }
    throw new Error(`Failed to load care card plants: ${plantsError.message}`);
  }

  const rows = plantRows ?? [];
  if (rows.length === 0) {
    return null;
  }

  const photoPaths: string[] = [];
  for (const row of rows) {
    const photos = (row as { plant_photos?: Array<{ storage_path: string; created_at: string }> })
      .plant_photos;
    if (!photos?.length) continue;
    const latest = [...photos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
    if (latest?.storage_path) photoPaths.push(latest.storage_path);
  }

  const signedUrls = photoPaths.length > 0 ? await signPhotoPaths(photoPaths, supabase) : new Map();

  const plants: CareCardPlant[] = [];

  for (const row of rows) {
    const id = typeof row.id === "string" ? row.id : null;
    const status = typeof row.status === "string" ? row.status : null;
    if (!id || !status || !isPlantStatus(status)) continue;

    const photos = (row as { plant_photos?: Array<{ storage_path: string; created_at: string }> })
      .plant_photos;
    const photoPath =
      photos && photos.length > 0
        ? [...photos].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0]?.storage_path ?? null
        : null;

    const pestType = unwrapRelation(
      (row as { pest_type_options?: { label?: string } | { label?: string }[] | null })
        .pest_type_options,
    );
    const pestTypeLabel =
      row.bugs_found === true &&
      pestType &&
      typeof pestType.label === "string" &&
      pestType.label.trim()
        ? pestType.label.trim()
        : null;

    const history = (row as { status_history?: Array<{ new_status: string; created_at: string }> })
      .status_history;
    const milestones = buildPlantMilestoneDatesFromHistory(history ?? []);

    const showAftercare = showCustomerAftercare(status);
    let treatmentNote: string | null = null;
    let careTips: CareCardCareTip[] = [];

    if (showAftercare) {
      const notes = (row as { treatment_notes?: Array<{ content?: string; updated_at?: string }> })
        .treatment_notes;
      const latestNote = notes?.length
        ? [...notes].sort(
            (a, b) =>
              new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
          )[0]
        : null;
      treatmentNote =
        typeof latestNote?.content === "string" && latestNote.content.trim()
          ? latestNote.content.trim()
          : null;

      const tips = (row as { care_tips?: Array<{ content?: string; updated_at?: string }> })
        .care_tips;
      const latestTip = tips?.length
        ? [...tips].sort(
            (a, b) =>
              new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
          )[0]
        : null;
      careTips = careTipsForCustomer(
        typeof latestTip?.content === "string" ? latestTip.content : null,
      );
    }

    const customerStatus = customerPlantStatus(status);

    plants.push({
      id,
      species: typeof row.species === "string" ? row.species : null,
      sizeLabel: formatPlantSizeLabel(typeof row.size === "string" ? row.size : null),
      status,
      statusLabel: customerStatus.label,
      statusMessage: customerStatus.message,
      photoUrl: photoPath ? (signedUrls.get(photoPath) ?? null) : null,
      pestTypeLabel,
      milestones,
      treatmentNote,
      careTips,
      showAftercare,
    });
  }

  if (plants.length === 0) {
    return null;
  }

  return {
    visitId,
    checkedInAt: visit.checkin_date,
    plants,
  };
}

async function getPublicCareCardWithoutPestType(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  visitId: string,
  checkinDate: string,
): Promise<PublicCareCard | null> {
  const { data: plantRows, error } = await supabase
    .from("plants")
    .select(
      `
      id,
      species,
      size,
      status,
      bugs_found,
      plant_photos (
        storage_path,
        created_at
      ),
      treatment_notes (
        content,
        updated_at
      ),
      care_tips (
        content,
        updated_at
      ),
      status_history (
        new_status,
        created_at
      )
    `,
    )
    .eq("visit_id", visitId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load care card plants: ${error.message}`);
  }

  // Re-enter via a minimal path: temporarily attach empty pest types by mapping
  const fakeRows = (plantRows ?? []).map((row) => ({ ...row, pest_type_options: null }));
  // Recurse-like mapping without pest join — duplicate slim map
  const photoPaths: string[] = [];
  for (const row of fakeRows) {
    const photos = (row as { plant_photos?: Array<{ storage_path: string; created_at: string }> })
      .plant_photos;
    if (!photos?.length) continue;
    const latest = [...photos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
    if (latest?.storage_path) photoPaths.push(latest.storage_path);
  }
  const signedUrls = photoPaths.length > 0 ? await signPhotoPaths(photoPaths, supabase) : new Map();
  const plants: CareCardPlant[] = [];

  for (const row of fakeRows) {
    const id = typeof row.id === "string" ? row.id : null;
    const status = typeof row.status === "string" ? row.status : null;
    if (!id || !status || !isPlantStatus(status)) continue;

    const photos = (row as { plant_photos?: Array<{ storage_path: string; created_at: string }> })
      .plant_photos;
    const photoPath =
      photos && photos.length > 0
        ? [...photos].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0]?.storage_path ?? null
        : null;

    const history = (row as { status_history?: Array<{ new_status: string; created_at: string }> })
      .status_history;
    const milestones = buildPlantMilestoneDatesFromHistory(history ?? []);
    const showAftercare = showCustomerAftercare(status);
    let treatmentNote: string | null = null;
    let careTips: CareCardCareTip[] = [];

    if (showAftercare) {
      const notes = (row as { treatment_notes?: Array<{ content?: string; updated_at?: string }> })
        .treatment_notes;
      const latestNote = notes?.length
        ? [...notes].sort(
            (a, b) =>
              new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
          )[0]
        : null;
      treatmentNote =
        typeof latestNote?.content === "string" && latestNote.content.trim()
          ? latestNote.content.trim()
          : null;

      const tips = (row as { care_tips?: Array<{ content?: string; updated_at?: string }> })
        .care_tips;
      const latestTip = tips?.length
        ? [...tips].sort(
            (a, b) =>
              new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
          )[0]
        : null;
      careTips = careTipsForCustomer(
        typeof latestTip?.content === "string" ? latestTip.content : null,
      );
    }

    const customerStatus = customerPlantStatus(status);
    plants.push({
      id,
      species: typeof row.species === "string" ? row.species : null,
      sizeLabel: formatPlantSizeLabel(typeof row.size === "string" ? row.size : null),
      status,
      statusLabel: customerStatus.label,
      statusMessage: customerStatus.message,
      photoUrl: photoPath ? (signedUrls.get(photoPath) ?? null) : null,
      pestTypeLabel: null,
      milestones,
      treatmentNote,
      careTips,
      showAftercare,
    });
  }

  if (plants.length === 0) return null;

  return { visitId, checkedInAt: checkinDate, plants };
}
