import type { SupabaseClient } from "@supabase/supabase-js";
import { emitPlantPropagatedEvent } from "@/lib/mailchimp/emit-plant-event";
import type { PlantSize } from "@/lib/plant-size";
import { SHOPIFY_VARIANT_IDS } from "@/lib/shopify/config";
import type { PosCheckoutPayload } from "@/lib/shopify/pos-checkout-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PropagatePlantResult =
  | { success: true; plantId: string; visitId: string }
  | { success: false; error: string };

/**
 * Propagate a standard plant in Surgery into a new pay-at-collection visit.
 * Uses the admin client for writes so we can set child pests independently of
 * the older DB RPC that blocked pests (HIL-127). Migration 0035 keeps the RPC
 * in sync when applied.
 */
export async function propagatePlantWithClient(
  supabase: SupabaseClient,
  sourcePlantId: string,
  size: PlantSize,
): Promise<PropagatePlantResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in as staff to propagate a plant." };
  }

  const { data: source, error: sourceError } = await supabase
    .from("plants")
    .select(
      `
      id,
      name,
      species,
      status,
      bugs_found,
      plant_category,
      visit_id,
      visits!inner (
        customer_id,
        customers!inner (
          first_name,
          last_name,
          email,
          shopify_customer_id
        )
      )
    `,
    )
    .eq("id", sourcePlantId)
    .maybeSingle();

  if (sourceError || !source) {
    return { success: false, error: "Source plant not found." };
  }

  if (source.plant_category !== "standard") {
    return { success: false, error: "A propagation plant cannot be propagated." };
  }

  if (source.status !== "in_surgery") {
    return { success: false, error: "Only a plant in surgery can be propagated." };
  }

  const { count: existingChildren, error: childError } = await supabase
    .from("plants")
    .select("id", { count: "exact", head: true })
    .eq("source_plant_id", sourcePlantId);

  if (childError) {
    return { success: false, error: childError.message };
  }

  if ((existingChildren ?? 0) > 0) {
    return { success: false, error: "This plant has already been propagated." };
  }

  const visit = Array.isArray(source.visits) ? source.visits[0] : source.visits;
  const customerRelation = visit?.customers;
  const customer = Array.isArray(customerRelation) ? customerRelation[0] : customerRelation;
  const customerId = visit?.customer_id as string | undefined;

  if (!customer || !customerId) {
    return { success: false, error: "Source plant customer not found." };
  }

  const visitId = crypto.randomUUID();
  const plantId = crypto.randomUUID();
  const customerName = `${customer.first_name} ${customer.last_name}`.trim();
  const payload: PosCheckoutPayload = {
    visitId,
    customerName,
    customerEmail: customer.email,
    shopifyCustomerId: customer.shopify_customer_id ?? null,
    cartNote: `Houseplant Hospital propagation: ${customerName} (${visitId})`,
    lineItems: [
      {
        variantId: SHOPIFY_VARIANT_IDS[size].propagationVariantId,
        quantity: 1,
        properties: [{ name: "_hh_visit_id", value: visitId }],
      },
    ],
  };

  // Source pests Yes or Not sure → child Yes; source No → child No.
  const childBugsFound = source.bugs_found !== false;

  const admin = createSupabaseAdminClient();

  const { error: visitInsertError } = await admin.from("visits").insert({
    id: visitId,
    customer_id: customerId,
    checkin_date: new Date().toISOString(),
    notes: null,
    created_by: user.id,
    payment_status: "pay_at_collection",
    pos_line_items: payload,
  });

  if (visitInsertError) {
    return { success: false, error: visitInsertError.message };
  }

  const { error: plantInsertError } = await admin.from("plants").insert({
    id: plantId,
    visit_id: visitId,
    name: source.name,
    species: source.species,
    size,
    status: "propagation",
    bugs_found: childBugsFound,
    bugs_found_ever: childBugsFound,
    pricing_modifier: 0,
    plant_category: "propagation",
    source_plant_id: sourcePlantId,
  });

  if (plantInsertError) {
    await admin.from("visits").delete().eq("id", visitId);
    return { success: false, error: plantInsertError.message };
  }

  const { error: historyError } = await admin.from("status_history").insert({
    plant_id: plantId,
    previous_status: null,
    new_status: "propagation",
    changed_by: user.id,
  });

  if (historyError) {
    await admin.from("plants").delete().eq("id", plantId);
    await admin.from("visits").delete().eq("id", visitId);
    return { success: false, error: historyError.message };
  }

  await emitPlantPropagatedEvent(supabase, sourcePlantId, plantId, size);

  return { success: true, plantId, visitId };
}
