// Custom worker entry — adds Cloudflare Cron Triggers on top of OpenNext.
// @ts-expect-error `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";

type CronRoute =
  | "/api/cron/mailchimp-outbox"
  | "/api/cron/shopify-pricing"
  | "/api/cron/print-jobs";

interface CloudflareEnv {
  CRON_SECRET?: string;
  APP_BASE_URL?: string;
}

const MAILCHIMP_OUTBOX_CRON = "*/5 * * * *";
const SHOPIFY_PRICING_CRON = "0 6 * * *";

function cronBaseUrl(env: CloudflareEnv): string {
  const fromEnv = env.APP_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  return "https://houseplanthospital.hildaedinburgh.workers.dev";
}

function routesForCron(cron: string): CronRoute[] {
  if (cron === MAILCHIMP_OUTBOX_CRON) {
    return ["/api/cron/mailchimp-outbox", "/api/cron/print-jobs"];
  }

  if (cron === SHOPIFY_PRICING_CRON) {
    return ["/api/cron/shopify-pricing"];
  }

  return [];
}

async function runCronRoute(
  env: CloudflareEnv,
  route: CronRoute,
): Promise<void> {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) {
    console.error(`[cron] CRON_SECRET not set — skipped ${route}`);
    return;
  }

  const url = `${cronBaseUrl(env)}${route}`;
  // Use public fetch — service bindings are unreliable in scheduled() handlers.
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[cron] ${route} failed (${response.status}): ${body}`);
    return;
  }

  console.log(`[cron] ${route} ok: ${await response.text()}`);
}

const POS_PENDING_PATH = "/api/shopify/pos/pending";

const POS_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function isPosPendingRequest(request: Request): boolean {
  try {
    return new URL(request.url).pathname === POS_PENDING_PATH;
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    // OpenNext often answers OPTIONS without app-route CORS headers.
    // POS UI extensions require a proper preflight for Authorization.
    if (request.method === "OPTIONS" && isPosPendingRequest(request)) {
      return new Response(null, { status: 204, headers: POS_CORS_HEADERS });
    }

    const response = await handler.fetch(request, env, ctx);

    if (!isPosPendingRequest(request)) {
      return response;
    }

    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(POS_CORS_HEADERS)) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  async scheduled(controller: ScheduledController, env: CloudflareEnv) {
    const routes = routesForCron(controller.cron);

    if (routes.length === 0) {
      console.error(`[cron] No routes configured for schedule: ${controller.cron}`);
      return;
    }

    for (const route of routes) {
      await runCronRoute(env, route);
    }
  },
} satisfies ExportedHandler<CloudflareEnv>;

// Re-export OpenNext durable objects (required when using custom worker entry).
// @ts-expect-error generated at build time
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
