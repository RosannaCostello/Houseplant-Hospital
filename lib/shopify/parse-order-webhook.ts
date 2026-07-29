import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { PosLineItemProperty } from "@/lib/shopify/pos-checkout-types";

type ShopifyOrderWebhook = {
  id: number | string;
  financial_status?: string;
  note?: string | null;
  note_attributes?: Array<{ name: string; value: string }>;
  line_items?: Array<{
    properties?: Array<{ name: string; value: string }>;
  }>;
};

export function verifyShopifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  const secret =
    process.env.SHOPIFY_WEBHOOK_SECRET?.trim() || process.env.SHOPIFY_CLIENT_SECRET?.trim();

  if (!secret || !hmacHeader) return false;

  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

function propertiesFromLineItems(order: ShopifyOrderWebhook): PosLineItemProperty[] {
  const properties: PosLineItemProperty[] = [];

  for (const lineItem of order.line_items ?? []) {
    for (const property of lineItem.properties ?? []) {
      if (property.name && property.value) {
        properties.push({ name: property.name, value: property.value });
      }
    }
  }

  return properties;
}

function draftIdFromNote(note: string | null | undefined): string | null {
  if (!note) return null;

  const match = note.match(/draft:\s*[^(]+\(([0-9a-f-]{36})\)/i);
  return match?.[1] ?? null;
}

function visitIdFromNote(note: string | null | undefined): string | null {
  if (!note) return null;

  const match = note.match(/visit:\s*[^(]+\(([0-9a-f-]{36})\)/i);
  return match?.[1] ?? null;
}

export function extractPosPaymentTargets(order: ShopifyOrderWebhook): {
  draftId?: string;
  visitId?: string;
  shopifyOrderId: string;
  isPaid: boolean;
} {
  const properties = propertiesFromLineItems(order);
  const draftId =
    properties.find((property) => property.name === "_hh_draft_id")?.value ??
    properties.find((property) => property.name === "hh_draft_id")?.value ??
    draftIdFromNote(order.note) ??
    undefined;
  const visitId =
    properties.find((property) => property.name === "_hh_visit_id")?.value ??
    properties.find((property) => property.name === "hh_visit_id")?.value ??
    visitIdFromNote(order.note) ??
    undefined;

  const financialStatus = order.financial_status?.toLowerCase() ?? "";
  const isPaid = financialStatus === "paid" || financialStatus === "partially_paid";

  return {
    draftId,
    visitId,
    shopifyOrderId: String(order.id),
    isPaid,
  };
}
