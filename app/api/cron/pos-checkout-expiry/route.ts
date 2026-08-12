import { NextResponse } from "next/server";
import { assertBearerCronSecret } from "@/lib/api/assert-cron-auth";
import { expireStalePosCheckoutsWithClient } from "@/lib/check-in/expire-stale-pos-checkouts";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = assertBearerCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    const supabase = createSupabaseAdminClient();
    const result = await expireStalePosCheckoutsWithClient(supabase);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Expire failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
