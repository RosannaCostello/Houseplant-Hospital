import { NextResponse } from "next/server";
import { assertBearerCronSecret } from "@/lib/api/assert-cron-auth";
import { processPendingPrintJobs } from "@/lib/printing/request-plant-label-print";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = assertBearerCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await processPendingPrintJobs();

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
