import { NextResponse } from "next/server";
import { markPosCheckoutPaidWithClient } from "@/lib/check-in/pos-checkout";
import { extractPosPaymentTargets, verifyShopifyWebhookHmac } from "@/lib/shopify/parse-order-webhook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let order: Parameters<typeof extractPosPaymentTargets>[0];

  try {
    order = JSON.parse(rawBody) as Parameters<typeof extractPosPaymentTargets>[0];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targets = extractPosPaymentTargets(order);

  if (!targets.isPaid) {
    return NextResponse.json({ ok: true, skipped: "not_paid" });
  }

  if (!targets.draftId && !targets.visitId) {
    return NextResponse.json({ ok: true, skipped: "no_hh_reference" });
  }

  const supabase = createSupabaseAdminClient();
  await markPosCheckoutPaidWithClient(supabase, {
    draftId: targets.draftId,
    visitId: targets.visitId,
    shopifyOrderId: targets.shopifyOrderId,
  });

  return NextResponse.json({ ok: true });
}
