import { NextResponse } from "next/server";
import { assertBearerCronSecret } from "@/lib/api/assert-cron-auth";
import { enqueueOutpatientReminders } from "@/lib/mailchimp/enqueue-outpatient-reminders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = assertBearerCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await enqueueOutpatientReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Outpatient reminders failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
