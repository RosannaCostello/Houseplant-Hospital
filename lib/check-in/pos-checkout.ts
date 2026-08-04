import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckInCustomer } from "@/lib/check-in/customer-schema";
import { checkInPlantsStepSchema, type CheckInPlant } from "@/lib/check-in/plant-schema";
import {
  buildPosCartFromPlants,
  buildPosCartFromVisitPlants,
} from "@/lib/shopify/build-pos-cart-from-plants";
import { isShopifyPricingConfigured } from "@/lib/shopify/env";
import type { PosCheckoutPayload, PosPaymentStatus } from "@/lib/shopify/pos-checkout-types";
import { isPosPaymentStatus, isVisitUnpaid } from "@/lib/shopify/pos-checkout-types";
import {
  saveShopifyCustomerIdOnRecord,
  upsertShopifyCustomerByEmail,
} from "@/lib/shopify/upsert-customer";

export type DraftCheckoutState = {
  status: PosPaymentStatus;
  queuedAt: string | null;
  paidAt: string | null;
  shopifyOrderId: string | null;
  summaryLines: string[];
};

function unwrapCustomerRow(
  value: unknown,
): CheckInCustomer | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;

  const legacy = row as {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string | null;
    marketing_consent?: boolean;
    firstName?: string;
    lastName?: string;
    marketingConsent?: boolean;
  };

  const firstName = legacy.firstName ?? legacy.first_name;
  const lastName = legacy.lastName ?? legacy.last_name;
  const email = legacy.email;

  if (!firstName || !lastName || !email) return null;

  return {
    firstName,
    lastName,
    email,
    phone: legacy.phone ?? "",
    marketingConsent: legacy.marketingConsent ?? legacy.marketing_consent ?? false,
  };
}

function shopifyCustomerIdFromRow(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const id = (row as { shopify_customer_id?: string | null }).shopify_customer_id;
  return id ?? null;
}

function parsePlants(value: unknown): CheckInPlant[] {
  const parsed = checkInPlantsStepSchema.safeParse({ plants: value });
  return parsed.success ? parsed.data.plants : [];
}

export function isPosCheckoutRequired(): boolean {
  return isShopifyPricingConfigured();
}

export async function getDraftCheckoutStateWithClient(
  supabase: SupabaseClient,
  draftId: string,
): Promise<DraftCheckoutState | null> {
  const { data, error } = await supabase
    .from("check_in_drafts")
    .select(
      "plants, pos_checkout_status, pos_checkout_queued_at, pos_checkout_paid_at, shopify_order_id, customers ( first_name, last_name, email, phone, marketing_consent )",
    )
    .eq("id", draftId)
    .maybeSingle();

  if (error || !data) return null;

  const status = isPosPaymentStatus(data.pos_checkout_status)
    ? data.pos_checkout_status
    : "not_started";

  const customer = unwrapCustomerRow(data.customers);
  const plants = parsePlants(data.plants);

  let summaryLines: string[] = [];
  if (customer && plants.length > 0) {
    const built = buildPosCartFromPlants({ plants, customer, draftId });
    if (built.success) {
      summaryLines = built.summaryLines;
    }
  }

  return {
    status,
    queuedAt: data.pos_checkout_queued_at,
    paidAt: data.pos_checkout_paid_at,
    shopifyOrderId: data.shopify_order_id,
    summaryLines,
  };
}

export async function queuePosCheckoutForDraftWithClient(
  supabase: SupabaseClient,
  draftId: string,
  plants: CheckInPlant[],
): Promise<{ success: true; summaryLines: string[] } | { success: false; error: string }> {
  const { data: draft, error } = await supabase
    .from("check_in_drafts")
    .select(
      "id, customer_id, customers ( first_name, last_name, email, phone, marketing_consent, shopify_customer_id )",
    )
    .eq("id", draftId)
    .maybeSingle();

  if (error || !draft) {
    return { success: false, error: "Draft check-in not found." };
  }

  const customer = unwrapCustomerRow(draft.customers);
  if (!customer) {
    return { success: false, error: "Customer details are missing." };
  }

  let shopifyCustomerId = shopifyCustomerIdFromRow(draft.customers);

  if (!shopifyCustomerId) {
    const synced = await upsertShopifyCustomerByEmail(customer);
    if (synced.success) {
      shopifyCustomerId = synced.shopifyCustomerId;
      await saveShopifyCustomerIdOnRecord(supabase, draft.customer_id, synced.shopifyCustomerId);
    }
  }

  const built = buildPosCartFromPlants({
    plants,
    customer,
    draftId,
    shopifyCustomerId,
  });

  if (!built.success) {
    return built;
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("check_in_drafts")
    .update({
      plants,
      draft_step: "plants",
      pos_checkout_status: "queued",
      pos_checkout_queued_at: now,
      pos_line_items: built.payload,
    })
    .eq("id", draftId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, summaryLines: built.summaryLines };
}

export async function deferPosCheckoutForDraftWithClient(
  supabase: SupabaseClient,
  draftId: string,
  plants: CheckInPlant[],
): Promise<{ success: true; summaryLines: string[] } | { success: false; error: string }> {
  const plantsParsed = checkInPlantsStepSchema.safeParse({ plants });
  if (!plantsParsed.success) {
    return { success: false, error: "Plant details are incomplete." };
  }

  const { data: draft, error: draftError } = await supabase
    .from("check_in_drafts")
    .select(
      "id, customer_id, customers ( first_name, last_name, email, phone, marketing_consent, shopify_customer_id )",
    )
    .eq("id", draftId)
    .maybeSingle();

  if (draftError || !draft) {
    return { success: false, error: "Draft check-in not found." };
  }

  const customer = unwrapCustomerRow(draft.customers);
  if (!customer) {
    return { success: false, error: "Customer details are missing." };
  }

  let shopifyCustomerId = shopifyCustomerIdFromRow(draft.customers);

  if (!shopifyCustomerId) {
    const synced = await upsertShopifyCustomerByEmail(customer);
    if (synced.success) {
      shopifyCustomerId = synced.shopifyCustomerId;
      await saveShopifyCustomerIdOnRecord(supabase, draft.customer_id, synced.shopifyCustomerId);
    }
  }

  const built = buildPosCartFromPlants({
    plants: plantsParsed.data.plants,
    customer,
    draftId,
    shopifyCustomerId,
    allowUnresolvedBugs: true,
    cartNotePrefix: "Houseplant Hospital collection",
  });

  if (!built.success) {
    return built;
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("check_in_drafts")
    .update({
      plants: plantsParsed.data.plants,
      draft_step: "plants",
      pos_checkout_status: "pay_at_collection",
      pos_checkout_queued_at: now,
      pos_line_items: built.payload,
    })
    .eq("id", draftId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, summaryLines: built.summaryLines };
}

export async function ensureVisitPosCartWithClient(
  supabase: SupabaseClient,
  visitId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select(
      "id, payment_status, customers ( first_name, last_name, email, phone, marketing_consent, shopify_customer_id )",
    )
    .eq("id", visitId)
    .maybeSingle();

  if (visitError || !visit) {
    return { success: false, error: "Visit not found." };
  }

  if (!isVisitUnpaid(isPosPaymentStatus(visit.payment_status) ? visit.payment_status : null)) {
    return { success: true };
  }

  const customer = unwrapCustomerRow(visit.customers);
  if (!customer) {
    return { success: false, error: "Customer details are missing." };
  }

  let shopifyCustomerId = shopifyCustomerIdFromRow(visit.customers);

  if (!shopifyCustomerId) {
    const { data: customerRow } = await supabase
      .from("visits")
      .select("customer_id")
      .eq("id", visitId)
      .maybeSingle();

    if (customerRow?.customer_id) {
      const synced = await upsertShopifyCustomerByEmail(customer);
      if (synced.success) {
        shopifyCustomerId = synced.shopifyCustomerId;
        await saveShopifyCustomerIdOnRecord(
          supabase,
          customerRow.customer_id,
          synced.shopifyCustomerId,
        );
      }
    }
  }

  const { data: plants, error: plantsError } = await supabase
    .from("plants")
    .select("size, bugs_found, plant_category")
    .eq("visit_id", visitId)
    .neq("status", "dead");

  if (plantsError) {
    return { success: false, error: plantsError.message };
  }

  if (!plants?.length) {
    return { success: false, error: "This visit has no plants to charge." };
  }

  const built = buildPosCartFromVisitPlants({
    plants: plants.map((plant) => ({
      size: plant.size,
      bugsFound: plant.bugs_found,
      plantCategory: plant.plant_category,
    })),
    customer,
    visitId,
    shopifyCustomerId,
    cartNotePrefix: "Houseplant Hospital collection",
  });

  if (!built.success) {
    return built;
  }

  const { error: updateError } = await supabase
    .from("visits")
    .update({ pos_line_items: built.payload })
    .eq("id", visitId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function settleVisitPaymentOutsideShopifyWithClient(
  supabase: SupabaseClient,
  visitId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const now = new Date().toISOString();
  const unpaidStatuses = ["queued", "loaded", "pay_at_collection"] as const;

  async function settle(withSettledVia: boolean) {
    return supabase
      .from("visits")
      .update(
        withSettledVia
          ? {
              payment_status: "paid",
              shopify_paid_at: now,
              payment_settled_via: "other",
            }
          : {
              payment_status: "paid",
              shopify_paid_at: now,
            },
      )
      .eq("id", visitId)
      .in("payment_status", [...unpaidStatuses])
      .select("id")
      .maybeSingle();
  }

  let { data, error } = await settle(true);

  if (error?.message.includes("payment_settled_via")) {
    ({ data, error } = await settle(false));
  }

  if (error) {
    return { success: false, error: error.message };
  }

  if (data) {
    return { success: true };
  }

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("payment_status")
    .eq("id", visitId)
    .maybeSingle();

  if (visitError) {
    return { success: false, error: visitError.message };
  }

  if (visit?.payment_status === "paid") {
    return { success: true };
  }

  return { success: false, error: "Could not mark this visit as paid outside Shopify." };
}

export type PendingPosCheckout = {
  id: string;
  type: "draft" | "visit";
  customerName: string;
  customerEmail: string;
  shopifyCustomerId: string | null;
  cartNote: string;
  lineItems: PosCheckoutPayload["lineItems"];
  queuedAt: string;
};

function posLineItemsForCheckout(
  payload: PosCheckoutPayload,
  input: { type: "draft" | "visit"; id: string },
): PosCheckoutPayload["lineItems"] {
  const propertyName = input.type === "draft" ? "_hh_draft_id" : "_hh_visit_id";

  return payload.lineItems.map((lineItem) => ({
    variantId: lineItem.variantId,
    quantity: lineItem.quantity,
    properties: [{ name: propertyName, value: input.id }],
  }));
}

export async function listPendingPosCheckoutsWithClient(
  supabase: SupabaseClient,
): Promise<PendingPosCheckout[]> {
  const results: PendingPosCheckout[] = [];

  const { data: drafts } = await supabase
    .from("check_in_drafts")
    .select(
      "id, pos_checkout_queued_at, pos_line_items, customers ( first_name, last_name, email, shopify_customer_id )",
    )
    .in("pos_checkout_status", ["queued", "loaded"])
    .order("pos_checkout_queued_at", { ascending: true });

  for (const draft of drafts ?? []) {
    const payload = draft.pos_line_items as PosCheckoutPayload | null;
    if (!payload?.lineItems?.length || !draft.pos_checkout_queued_at) continue;

    results.push({
      id: draft.id,
      type: "draft",
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      shopifyCustomerId: payload.shopifyCustomerId,
      cartNote: payload.cartNote,
      lineItems: posLineItemsForCheckout(payload, { type: "draft", id: draft.id }),
      queuedAt: draft.pos_checkout_queued_at,
    });
  }

  const { data: visits } = await supabase
    .from("visits")
    .select(
      "id, pos_line_items, checkin_date, customers ( first_name, last_name, email, shopify_customer_id )",
    )
    .in("payment_status", ["queued", "loaded", "pay_at_collection"])
    .order("checkin_date", { ascending: true });

  for (const visit of visits ?? []) {
    const payload = visit.pos_line_items as PosCheckoutPayload | null;
    if (!payload?.lineItems?.length) continue;

    results.push({
      id: visit.id,
      type: "visit",
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      shopifyCustomerId: payload.shopifyCustomerId,
      cartNote: payload.cartNote,
      lineItems: posLineItemsForCheckout(payload, { type: "visit", id: visit.id }),
      queuedAt: visit.checkin_date,
    });
  }

  return results;
}

export async function markPosCheckoutLoadedWithClient(
  supabase: SupabaseClient,
  input: { type: "draft" | "visit"; id: string },
): Promise<{ success: true } | { success: false; error: string }> {
  if (input.type === "draft") {
    const { error } = await supabase
      .from("check_in_drafts")
      .update({ pos_checkout_status: "loaded" })
      .eq("id", input.id)
      .in("pos_checkout_status", ["queued", "loaded"]);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  const { error } = await supabase
    .from("visits")
    .update({ payment_status: "loaded" })
    .eq("id", input.id)
    .in("payment_status", ["queued", "pay_at_collection", "loaded"]);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function markPosCheckoutPaidWithClient(
  supabase: SupabaseClient,
  input: {
    draftId?: string;
    visitId?: string;
    shopifyOrderId: string;
  },
): Promise<void> {
  const now = new Date().toISOString();

  if (input.draftId) {
    await supabase
      .from("check_in_drafts")
      .update({
        pos_checkout_status: "paid",
        pos_checkout_paid_at: now,
        shopify_order_id: input.shopifyOrderId,
      })
      .eq("id", input.draftId)
      .in("pos_checkout_status", ["queued", "loaded", "pay_at_collection", "paid", "not_started"]);
  }

  if (input.visitId) {
    await supabase
      .from("visits")
      .update({
        payment_status: "paid",
        shopify_paid_at: now,
        shopify_order_id: input.shopifyOrderId,
        payment_settled_via: "shopify",
      })
      .eq("id", input.visitId)
      .or(
        `payment_status.is.null,payment_status.in.(queued,loaded,pay_at_collection,not_started,paid)`,
      );
  }
}

export type DraftPaymentSnapshot = {
  paymentStatus: PosPaymentStatus;
  shopifyOrderId: string | null;
  posLineItems: PosCheckoutPayload | null;
  paidAt: string | null;
};

export async function getDraftPaymentSnapshotWithClient(
  supabase: SupabaseClient,
  draftId: string,
): Promise<DraftPaymentSnapshot | null> {
  const { data, error } = await supabase
    .from("check_in_drafts")
    .select("pos_checkout_status, shopify_order_id, pos_line_items, pos_checkout_paid_at")
    .eq("id", draftId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    paymentStatus: isPosPaymentStatus(data.pos_checkout_status)
      ? data.pos_checkout_status
      : "not_started",
    shopifyOrderId: data.shopify_order_id,
    posLineItems: data.pos_line_items as PosCheckoutPayload | null,
    paidAt: data.pos_checkout_paid_at,
  };
}

export function visitPaymentStatusFromDraft(
  draftStatus: PosPaymentStatus,
): PosPaymentStatus {
  if (draftStatus === "loaded") {
    return "queued";
  }

  if (draftStatus === "cancelled") {
    return "not_started";
  }

  return draftStatus;
}
