import "server-only";

import { SHOPIFY_ADMIN_API_VERSION } from "@/lib/shopify/config";
import { getShopifyConfig } from "@/lib/shopify/env";

type TokenResponse = {
  access_token: string;
  scope: string;
  expires_in: number;
};

export async function getShopifyAccessToken(): Promise<string> {
  const { storeDomain, clientId, clientSecret } = getShopifyConfig();

  const response = await fetch(
    `https://${storeDomain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify token request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as TokenResponse;

  if (!data.access_token) {
    throw new Error("Shopify token response did not include access_token.");
  }

  return data.access_token;
}

export function shopifyAdminGraphqlUrl(storeDomain: string): string {
  return `https://${storeDomain}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`;
}
