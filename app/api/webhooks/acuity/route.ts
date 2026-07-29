import { NextResponse } from "next/server";
import { fetchAcuityAppointment } from "@/lib/acuity/client";
import { createCheckInDraftFromAcuityAppointment } from "@/lib/acuity/create-draft-from-appointment";
import { isAcuityConfigured } from "@/lib/acuity/env";
import { verifyAcuityWebhookSignature } from "@/lib/acuity/verify-webhook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Acuity posts application/x-www-form-urlencoded:
 * action=scheduled|rescheduled|canceled|changed&id=<appointmentId>&...
 * MVP only handles scheduled/booked creates.
 */
export async function POST(request: Request) {
  if (!isAcuityConfigured()) {
    return NextResponse.json({ error: "Acuity is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-acuity-signature");

  if (!verifyAcuityWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const action = (params.get("action") ?? "").toLowerCase();
  const appointmentIdRaw = params.get("id");
  const appointmentId = appointmentIdRaw ? Number(appointmentIdRaw) : NaN;

  if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
    return NextResponse.json({ ok: true, skipped: "missing_appointment_id" });
  }

  // Static webhooks use action=scheduled; dynamic API uses appointment.scheduled.
  const isScheduled =
    action === "scheduled" ||
    action === "appointment.scheduled" ||
    action === "schedule";

  if (!isScheduled) {
    return NextResponse.json({ ok: true, skipped: "ignored_action", action });
  }

  const fetched = await fetchAcuityAppointment(appointmentId);
  if (!fetched.success) {
    console.error("[acuity] fetch failed:", fetched.error);
    return NextResponse.json({ error: fetched.error }, { status: 502 });
  }

  if (fetched.appointment.canceled) {
    return NextResponse.json({ ok: true, skipped: "canceled" });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const result = await createCheckInDraftFromAcuityAppointment(supabase, fetched.appointment);

    if (!result.success) {
      console.error("[acuity] draft create failed:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      draftId: result.draftId,
      created: result.created,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("[acuity] webhook failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
