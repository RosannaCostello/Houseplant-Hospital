import type { CheckInCustomer } from "@/lib/check-in/customer-schema";
import type { CheckInPlant } from "@/lib/check-in/plant-schema";
import { checkInPlantsStepSchema } from "@/lib/check-in/plant-schema";
import { SHOPIFY_VARIANT_IDS } from "@/lib/shopify/config";
import type { PosCheckoutPayload, PosLineItem } from "@/lib/shopify/pos-checkout-types";

export type BuildPosCartResult =
  | { success: true; payload: PosCheckoutPayload; summaryLines: string[] }
  | { success: false; error: string };

function plantLabel(plant: CheckInPlant, index: number): string {
  const name = plant.name?.trim() || plant.species?.trim();
  return name || `Plant ${index + 1}`;
}

function lineItemForPlant(
  plant: CheckInPlant,
  index: number,
  context: { draftId?: string; visitId?: string },
): PosLineItem {
  const mapping = SHOPIFY_VARIANT_IDS[plant.size];
  const variantId = plant.bugsFound === true ? mapping.pestsVariantId : mapping.standardVariantId;
  const treatment = plant.bugsFound === true ? "pests" : "standard";

  const properties: PosLineItem["properties"] = [
    { name: "hh_plant_client_id", value: plant.clientId },
    { name: "hh_size", value: plant.size },
    { name: "hh_treatment", value: treatment },
    { name: "hh_plant_label", value: plantLabel(plant, index) },
  ];

  if (context.draftId) {
    properties.push({ name: "hh_draft_id", value: context.draftId });
  }

  if (context.visitId) {
    properties.push({ name: "hh_visit_id", value: context.visitId });
  }

  return {
    variantId,
    quantity: 1,
    properties,
  };
}

export function summarizePosLineItems(plants: CheckInPlant[]): string[] {
  const counts = new Map<string, number>();

  for (const plant of plants) {
    const mapping = SHOPIFY_VARIANT_IDS[plant.size];
    const treatment = plant.bugsFound === true ? "pests" : "standard";
    const key = `${plant.size} ${treatment}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()].map(([key, count]) => `${count}× ${key}`);
}

export function buildPosCartFromPlants(input: {
  plants: CheckInPlant[];
  customer: CheckInCustomer;
  draftId?: string;
  visitId?: string;
  shopifyCustomerId?: string | null;
}): BuildPosCartResult {
  const plantsParsed = checkInPlantsStepSchema.safeParse({ plants: input.plants });

  if (!plantsParsed.success) {
    return { success: false, error: "Plant details are incomplete." };
  }

  const plants = plantsParsed.data.plants;
  const missingBugs = plants.filter((plant) => plant.bugsFound === null);

  if (missingBugs.length > 0) {
    return {
      success: false,
      error: `Select whether bugs were found for each plant (${missingBugs.length} remaining).`,
    };
  }

  if (!input.draftId && !input.visitId) {
    return { success: false, error: "Checkout requires a draft or visit id." };
  }

  const customerName = `${input.customer.firstName} ${input.customer.lastName}`.trim();
  const context = { draftId: input.draftId, visitId: input.visitId };
  const lineItems = plants.map((plant, index) => lineItemForPlant(plant, index, context));
  const referenceId = input.draftId ?? input.visitId ?? "";
  const referenceType = input.draftId ? "draft" : "visit";

  return {
    success: true,
    summaryLines: summarizePosLineItems(plants),
    payload: {
      draftId: input.draftId,
      visitId: input.visitId,
      customerName,
      customerEmail: input.customer.email,
      shopifyCustomerId: input.shopifyCustomerId ?? null,
      cartNote: `Houseplant Hospital ${referenceType}: ${customerName} (${referenceId})`,
      lineItems,
    },
  };
}
