import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlantSize } from "@/lib/plant-size";
import { SHOPIFY_VARIANT_IDS } from "@/lib/shopify/config";
import type { PosCheckoutPayload } from "@/lib/shopify/pos-checkout-types";

export type PropagatePlantResult =
  | { success: true; plantId: string; visitId: string }
  | { success: false; error: string };

function rpcErrorMessage(message: string): string {
  const knownMessages = [
    "Source plant not found.",
    "A propagation plant cannot be propagated.",
    "Only a plant in surgery can be propagated.",
    "A plant with pests cannot be propagated.",
    "This plant has already been propagated.",
  ];

  return knownMessages.find((known) => message.includes(known)) ?? "Could not propagate this plant.";
}

export async function propagatePlantWithClient(
  supabase: SupabaseClient,
  sourcePlantId: string,
  size: PlantSize,
): Promise<PropagatePlantResult> {
  const { data: source, error: sourceError } = await supabase
    .from("plants")
    .select(
      `
      id,
      visits!inner (
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

  const visit = Array.isArray(source.visits) ? source.visits[0] : source.visits;
  const customerRelation = visit?.customers;
  const customer = Array.isArray(customerRelation) ? customerRelation[0] : customerRelation;

  if (!customer) {
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

  const { data, error } = await supabase.rpc("propagate_plant", {
    p_source_plant_id: sourcePlantId,
    p_new_visit_id: visitId,
    p_new_plant_id: plantId,
    p_size: size,
    p_pos_line_items: payload,
  });

  if (error) {
    return { success: false, error: rpcErrorMessage(error.message) };
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.plant_id || !result?.visit_id) {
    return { success: false, error: "Propagation was not created." };
  }

  return { success: true, plantId: result.plant_id, visitId: result.visit_id };
}
