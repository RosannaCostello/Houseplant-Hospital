import "server-only";

import { mailchimpRequest } from "@/lib/mailchimp/client";

type PingResponse = {
  health_status?: string;
};

/** Verify API key and server prefix (GET /ping). */
export async function pingMailchimp(): Promise<string> {
  const result = await mailchimpRequest<PingResponse>({
    method: "GET",
    path: "/ping",
  });

  return result.health_status ?? "ok";
}
