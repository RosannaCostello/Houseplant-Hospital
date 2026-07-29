import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listPendingPosCheckoutsWithClient,
  markPosCheckoutLoadedWithClient,
} from "@/lib/check-in/pos-checkout";

export const dynamic = "force-dynamic";

/** POS UI extensions fetch from Shopify origins; Shopify requires wildcard CORS. */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function jsonWithCors(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: CORS_HEADERS,
  });
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const pending = await listPendingPosCheckoutsWithClient(supabase);

  return jsonWithCors({ pending });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { type?: string; id?: string };
  const type = body.type === "visit" ? "visit" : body.type === "draft" ? "draft" : null;
  const id = body.id;

  if (!type || !id) {
    return jsonWithCors({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const result = await markPosCheckoutLoadedWithClient(supabase, { type, id });

  if (!result.success) {
    return jsonWithCors(result, { status: 500 });
  }

  return jsonWithCors({ success: true });
}
