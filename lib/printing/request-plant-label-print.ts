import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPrintJobPayload, type PlantPrintSource } from "@/lib/printing/build-print-payload";
import { deliverPrintJobToBridge } from "@/lib/printing/deliver-print-job";
import { isPrintBridgeConfigured } from "@/lib/printing/env";
import type { PrintJobPayload } from "@/lib/printing/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RequestPlantLabelPrintResult =
  | {
      success: true;
      jobId: string;
      status: "pending" | "sent";
      message: string;
    }
  | { success: false; error: string };

type PrintJobRow = {
  id: string;
  plant_id: string | null;
  payload: PrintJobPayload;
  status: string;
  attempts: number;
};

async function loadPlantForPrint(
  supabase: SupabaseClient,
  plantId: string,
): Promise<PlantPrintSource | { error: string }> {
  const { data, error } = await supabase
    .from("plants")
    .select(
      `
      id,
      name,
      species,
      size,
      bugs_found,
      visits!inner (
        checkin_date,
        customers!inner (
          last_name
        )
      )
    `,
    )
    .eq("id", plantId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Plant not found." };

  const visit = Array.isArray(data.visits) ? data.visits[0] : data.visits;
  const customer = visit
    ? Array.isArray(visit.customers)
      ? visit.customers[0]
      : visit.customers
    : null;

  if (!visit || !customer) {
    return { error: "Plant visit or customer missing." };
  }

  return {
    id: data.id as string,
    name: (data.name as string | null) ?? null,
    species: (data.species as string | null) ?? null,
    size: data.size as string,
    bugsFound: (data.bugs_found as boolean | null) ?? null,
    checkedInAt: visit.checkin_date as string,
    customer: { lastName: (customer.last_name as string) ?? "" },
  };
}

async function markJobAttempt(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  jobId: string,
  attempts: number,
  result: Awaited<ReturnType<typeof deliverPrintJobToBridge>>,
): Promise<"pending" | "sent" | "failed"> {
  if (result.ok) {
    await admin
      .from("print_jobs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        last_error: null,
        attempts: attempts + 1,
      })
      .eq("id", jobId);
    return "sent";
  }

  const status = result.retryable ? "pending" : "failed";
  await admin
    .from("print_jobs")
    .update({
      status,
      last_error: result.error.slice(0, 500),
      attempts: attempts + 1,
    })
    .eq("id", jobId);
  return status;
}

/**
 * Enqueue a print_jobs row and attempt immediate delivery to the Mac Mini bridge.
 * If the Mini is offline / unreachable, status stays `pending` for later drain.
 */
export async function requestPlantLabelPrint(
  supabase: SupabaseClient,
  plantId: string,
): Promise<RequestPlantLabelPrintResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to print a label." };
  }

  const plant = await loadPlantForPrint(supabase, plantId);
  if ("error" in plant) {
    return { success: false, error: plant.error };
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return {
      success: false,
      error: "Printing requires SUPABASE_SERVICE_ROLE_KEY on the server.",
    };
  }

  const draftPayload = buildPrintJobPayload(plant);
  const { data: inserted, error: insertError } = await admin
    .from("print_jobs")
    .insert({
      plant_id: plantId,
      payload: draftPayload,
      status: "pending",
      attempts: 0,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      success: false,
      error: insertError?.message ?? "Could not create print job.",
    };
  }

  const jobId = inserted.id as string;
  const payload = buildPrintJobPayload(plant, jobId);
  await admin.from("print_jobs").update({ payload }).eq("id", jobId);

  if (!isPrintBridgeConfigured()) {
    return {
      success: true,
      jobId,
      status: "pending",
      message:
        "Label queued. Set PRINT_BRIDGE_URL + PRINT_BRIDGE_SECRET (and a tunnel to the Mini) to print.",
    };
  }

  const delivery = await deliverPrintJobToBridge(payload);
  const status = await markJobAttempt(admin, jobId, 0, delivery);

  if (status === "sent") {
    return {
      success: true,
      jobId,
      status: "sent",
      message: delivery.ok ? (delivery.bridgeMessage ?? "Sent to printer.") : "Sent to printer.",
    };
  }

  if (status === "failed") {
    return {
      success: false,
      error: delivery.ok ? "Print failed." : delivery.error,
    };
  }

  return {
    success: true,
    jobId,
    status: "pending",
    message:
      "Label queued — printer bridge unreachable. It will retry when the Mini is online.",
  };
}

export type ProcessPendingPrintJobsResult = {
  success: boolean;
  skipped?: string;
  processed: number;
  sent: number;
  failed: number;
  stillPending: number;
};

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 12;

/** Drain pending print_jobs (cron / manual). Leaves pending when Mini is offline. */
export async function processPendingPrintJobs(): Promise<ProcessPendingPrintJobsResult> {
  if (!isPrintBridgeConfigured()) {
    return {
      success: true,
      skipped: "print_bridge_not_configured",
      processed: 0,
      sent: 0,
      failed: 0,
      stillPending: 0,
    };
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return {
      success: false,
      skipped: "missing_service_role",
      processed: 0,
      sent: 0,
      failed: 0,
      stillPending: 0,
    };
  }

  const { data: rows, error } = await admin
    .from("print_jobs")
    .select("id, plant_id, payload, status, attempts")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return {
      success: false,
      skipped: error.message,
      processed: 0,
      sent: 0,
      failed: 0,
      stillPending: 0,
    };
  }

  let sent = 0;
  let failed = 0;
  let stillPending = 0;

  for (const row of (rows ?? []) as PrintJobRow[]) {
    const payload = {
      ...row.payload,
      jobId: row.id,
      plantId: row.payload.plantId || row.plant_id || "",
    };
    const delivery = await deliverPrintJobToBridge(payload);
    const status = await markJobAttempt(admin, row.id, row.attempts ?? 0, delivery);
    if (status === "sent") sent += 1;
    else if (status === "failed") failed += 1;
    else stillPending += 1;
  }

  return {
    success: true,
    processed: (rows ?? []).length,
    sent,
    failed,
    stillPending,
  };
}
