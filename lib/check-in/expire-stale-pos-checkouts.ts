import type { SupabaseClient } from "@supabase/supabase-js";
import { isPosCheckoutQueueExpired } from "@/lib/shopify/pos-checkout-ttl";

export type ExpireStalePosCheckoutsResult = {
  success: true;
  draftsCancelled: number;
  visitsCancelled: number;
};

/** Cancel drafts/visits still queued or loaded in POS for 24h+. Leaves pay_at_collection alone (those never appear on the POS pending list). */
export async function expireStalePosCheckoutsWithClient(
  supabase: SupabaseClient,
  nowMs: number = Date.now(),
): Promise<ExpireStalePosCheckoutsResult> {
  let draftsCancelled = 0;
  let visitsCancelled = 0;

  const { data: drafts, error: draftsError } = await supabase
    .from("check_in_drafts")
    .select("id, pos_checkout_queued_at")
    .in("pos_checkout_status", ["queued", "loaded"]);

  if (draftsError) {
    throw new Error(draftsError.message);
  }

  const staleDraftIds = (drafts ?? [])
    .filter((draft) => isPosCheckoutQueueExpired(draft.pos_checkout_queued_at, nowMs))
    .map((draft) => draft.id);

  if (staleDraftIds.length > 0) {
    const { error } = await supabase
      .from("check_in_drafts")
      .update({ pos_checkout_status: "cancelled" })
      .in("id", staleDraftIds)
      .in("pos_checkout_status", ["queued", "loaded"]);
    if (error) throw new Error(error.message);
    draftsCancelled = staleDraftIds.length;
  }

  const { data: visits, error: visitsError } = await supabase
    .from("visits")
    .select("id, checkin_date")
    .in("payment_status", ["queued", "loaded"]);

  if (visitsError) {
    throw new Error(visitsError.message);
  }

  const staleVisitIds = (visits ?? [])
    .filter((visit) => isPosCheckoutQueueExpired(visit.checkin_date, nowMs))
    .map((visit) => visit.id);

  if (staleVisitIds.length > 0) {
    const { error } = await supabase
      .from("visits")
      .update({ payment_status: "cancelled" })
      .in("id", staleVisitIds)
      .in("payment_status", ["queued", "loaded"]);
    if (error) throw new Error(error.message);
    visitsCancelled = staleVisitIds.length;
  }

  return { success: true, draftsCancelled, visitsCancelled };
}
