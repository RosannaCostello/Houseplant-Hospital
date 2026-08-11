import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { registerPrintBridgeUrl } from "@/lib/printing/register-bridge-url";
import { secretsMatch } from "@/lib/printing/secrets-match";

export const dynamic = "force-dynamic";

/**
 * Mini tunnel LaunchAgent calls this after cloudflared starts so the Worker
 * always has the current public bridge URL (HIL-85).
 */
export async function POST(request: Request) {
  const env = getEnv();
  if (!env.PRINT_BRIDGE_SECRET) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  if (!token || !secretsMatch(token, env.PRINT_BRIDGE_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ ok: false, error: "url_required" }, { status: 400 });
  }

  const result = await registerPrintBridgeUrl(body.url);
  if (!result.success) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, baseUrl: result.baseUrl });
}
