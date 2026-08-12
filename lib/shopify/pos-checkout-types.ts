export const POS_PAYMENT_STATUSES = [
  "not_started",
  "queued",
  "loaded",
  "paid",
  "pay_at_collection",
  "cancelled",
] as const;

export type PosPaymentStatus = (typeof POS_PAYMENT_STATUSES)[number];

export type PosLineItemProperty = {
  name: string;
  value: string;
};

export type PosLineItem = {
  variantId: string;
  quantity: number;
  properties: PosLineItemProperty[];
};

/** Replace same-named properties; keep the rest (e.g. Size when adding `_hh_visit_id`). */
export function mergePosLineProperties(
  existing: PosLineItemProperty[] | undefined,
  next: PosLineItemProperty[],
): PosLineItemProperty[] {
  const replace = new Set(next.map((property) => property.name));
  return [...(existing ?? []).filter((property) => !replace.has(property.name)), ...next];
}

export type PosCheckoutPayload = {
  draftId?: string;
  visitId?: string;
  customerName: string;
  customerEmail: string;
  shopifyCustomerId: string | null;
  cartNote: string;
  lineItems: PosLineItem[];
};

export function isPosPaymentStatus(value: string): value is PosPaymentStatus {
  return (POS_PAYMENT_STATUSES as readonly string[]).includes(value);
}

export const PHOTOS_ALLOWED_PAYMENT_STATUSES: PosPaymentStatus[] = ["paid", "pay_at_collection"];

export function canProceedToPhotosStep(
  status: PosPaymentStatus | null | undefined,
  posCheckoutRequired: boolean,
): boolean {
  if (!posCheckoutRequired) return true;
  if (!status) return false;
  return PHOTOS_ALLOWED_PAYMENT_STATUSES.includes(status);
}

export function isVisitUnpaid(status: PosPaymentStatus | null | undefined): boolean {
  if (!status || status === "not_started" || status === "cancelled") {
    return true;
  }
  return status === "pay_at_collection" || status === "queued" || status === "loaded";
}
