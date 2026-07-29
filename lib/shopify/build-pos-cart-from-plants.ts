import type { CheckInCustomer } from "@/lib/check-in/customer-schema";
import type { CheckInPlant } from "@/lib/check-in/plant-schema";
import { checkInPlantsStepSchema } from "@/lib/check-in/plant-schema";
import { isPlantCategory, type PlantCategory } from "@/lib/plant-category";
import { isPlantSize, type PlantSize } from "@/lib/plant-size";
import { SHOPIFY_VARIANT_IDS } from "@/lib/shopify/config";
import type { PosCheckoutPayload, PosLineItem } from "@/lib/shopify/pos-checkout-types";

export type BuildPosCartResult =
  | { success: true; payload: PosCheckoutPayload; summaryLines: string[] }
  | { success: false; error: string };

export type PosCartPlantInput = {
  size: PlantSize;
  bugsFound: boolean | null;
  plantCategory?: PlantCategory;
};

function lineItemForPlant(
  plant: PosCartPlantInput,
  context: { draftId?: string; visitId?: string },
): PosLineItem {
  const mapping = SHOPIFY_VARIANT_IDS[plant.size];
  const category = plant.plantCategory ?? "standard";
  const variantId =
    category === "propagation"
      ? mapping.propagationVariantId
      : plant.bugsFound === true
        ? mapping.pestsVariantId
        : mapping.standardVariantId;
  const properties: PosLineItem["properties"] = [];

  if (context.draftId) {
    properties.push({ name: "_hh_draft_id", value: context.draftId });
  }

  if (context.visitId) {
    properties.push({ name: "_hh_visit_id", value: context.visitId });
  }

  return {
    variantId,
    quantity: 1,
    properties,
  };
}

export function summarizePosLineItems(plants: PosCartPlantInput[]): string[] {
  const counts = new Map<string, number>();

  for (const plant of plants) {
    const category = plant.plantCategory ?? "standard";
    const treatment =
      category === "propagation"
        ? "propagation"
        : plant.bugsFound === true
          ? "pests"
          : "standard";
    const key = `${plant.size} ${treatment}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()].map(([key, count]) => `${count}× ${key}`);
}

function buildPayload(input: {
  plants: PosCartPlantInput[];
  customer: CheckInCustomer;
  draftId?: string;
  visitId?: string;
  shopifyCustomerId?: string | null;
  cartNotePrefix?: string;
}): BuildPosCartResult {
  if (input.plants.length === 0) {
    return { success: false, error: "Add at least one plant." };
  }

  if (!input.draftId && !input.visitId) {
    return { success: false, error: "Checkout requires a draft or visit id." };
  }

  const customerName = `${input.customer.firstName} ${input.customer.lastName}`.trim();
  const context = { draftId: input.draftId, visitId: input.visitId };
  const lineItems = input.plants.map((plant) => lineItemForPlant(plant, context));
  const referenceId = input.draftId ?? input.visitId ?? "";
  const referenceType = input.draftId ? "draft" : "visit";
  const prefix = input.cartNotePrefix ?? "Houseplant Hospital";

  return {
    success: true,
    summaryLines: summarizePosLineItems(input.plants),
    payload: {
      draftId: input.draftId,
      visitId: input.visitId,
      customerName,
      customerEmail: input.customer.email,
      shopifyCustomerId: input.shopifyCustomerId ?? null,
      cartNote: `${prefix} ${referenceType}: ${customerName} (${referenceId})`,
      lineItems,
    },
  };
}

export function buildPosCartFromPlants(input: {
  plants: CheckInPlant[];
  customer: CheckInCustomer;
  draftId?: string;
  visitId?: string;
  shopifyCustomerId?: string | null;
  /** When true, unanswered pests map to the standard (non-pests) variant. */
  allowUnresolvedBugs?: boolean;
  cartNotePrefix?: string;
}): BuildPosCartResult {
  const plantsParsed = checkInPlantsStepSchema.safeParse({ plants: input.plants });

  if (!plantsParsed.success) {
    return { success: false, error: "Plant details are incomplete." };
  }

  const plants = plantsParsed.data.plants;
  const missingBugs = plants.filter((plant) => plant.bugsFound === null);

  if (!input.allowUnresolvedBugs && missingBugs.length > 0) {
    return {
      success: false,
      error: `Select whether pests were found for each plant (${missingBugs.length} remaining).`,
    };
  }

  return buildPayload({
    plants: plants.map((plant) => ({
      size: plant.size,
      bugsFound: plant.bugsFound,
      plantCategory: "standard",
    })),
    customer: input.customer,
    draftId: input.draftId,
    visitId: input.visitId,
    shopifyCustomerId: input.shopifyCustomerId,
    cartNotePrefix: input.cartNotePrefix,
  });
}

export function buildPosCartFromVisitPlants(input: {
  plants: Array<{
    size: string;
    bugsFound: boolean | null;
    plantCategory?: string | null;
  }>;
  customer: CheckInCustomer;
  visitId: string;
  shopifyCustomerId?: string | null;
  cartNotePrefix?: string;
}): BuildPosCartResult {
  const plants: PosCartPlantInput[] = [];

  for (const plant of input.plants) {
    if (!isPlantSize(plant.size)) {
      return { success: false, error: "One or more plants has an invalid size." };
    }

    plants.push({
      size: plant.size,
      bugsFound: plant.bugsFound,
      plantCategory: isPlantCategory(plant.plantCategory) ? plant.plantCategory : "standard",
    });
  }

  return buildPayload({
    plants,
    customer: input.customer,
    visitId: input.visitId,
    shopifyCustomerId: input.shopifyCustomerId,
    cartNotePrefix: input.cartNotePrefix,
  });
}
