import { NextResponse } from "next/server";
import { assertBearerCronSecret } from "@/lib/api/assert-cron-auth";
import { processMailchimpOutbox } from "@/lib/mailchimp/process-outbox";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = assertBearerCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await processMailchimpOutbox();

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
