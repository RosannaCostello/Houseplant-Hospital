// Custom worker entry — adds Cloudflare Cron Triggers on top of OpenNext.
// @ts-expect-error `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";

type CronRoute = "/api/cron/mailchimp-outbox" | "/api/cron/shopify-pricing";

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
    return ["/api/cron/mailchimp-outbox"];
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

export default {
  fetch: handler.fetch,

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
