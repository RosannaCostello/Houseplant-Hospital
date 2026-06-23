import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listPendingPosCheckoutsWithClient,
  markPosCheckoutLoadedWithClient,
} from "@/lib/check-in/pos-checkout";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const pending = await listPendingPosCheckoutsWithClient(supabase);

  return NextResponse.json({ pending });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { type?: string; id?: string };
  const type = body.type === "visit" ? "visit" : body.type === "draft" ? "draft" : null;
  const id = body.id;

  if (!type || !id) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const result = await markPosCheckoutLoadedWithClient(supabase, { type, id });

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
