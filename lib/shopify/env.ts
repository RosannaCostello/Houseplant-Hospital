import "server-only";

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return value;
}

export type ShopifyConfig = {
  storeDomain: string;
  clientId: string;
  clientSecret: string;
};

export function isShopifyPricingConfigured(): boolean {
  return Boolean(
    emptyToUndefined(process.env.SHOPIFY_STORE_DOMAIN) &&
      emptyToUndefined(process.env.SHOPIFY_CLIENT_ID) &&
      emptyToUndefined(process.env.SHOPIFY_CLIENT_SECRET),
  );
}

export function getShopifyConfig(): ShopifyConfig {
  const storeDomain = emptyToUndefined(process.env.SHOPIFY_STORE_DOMAIN);
  const clientId = emptyToUndefined(process.env.SHOPIFY_CLIENT_ID);
  const clientSecret = emptyToUndefined(process.env.SHOPIFY_CLIENT_SECRET);

  if (!storeDomain || !clientId || !clientSecret) {
    throw new Error(
      "Shopify is not configured. Set SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, and SHOPIFY_CLIENT_SECRET.",
    );
  }

  return { storeDomain, clientId, clientSecret };
}
