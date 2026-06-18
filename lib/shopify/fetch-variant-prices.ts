import "server-only";

import { getShopifyAccessToken, shopifyAdminGraphqlUrl } from "@/lib/shopify/get-access-token";
import { getShopifyConfig } from "@/lib/shopify/env";
import { roundMoney } from "@/lib/pricing/round-money";

type VariantPriceMap = Map<string, number>;

type GraphqlNodesResponse = {
  data?: {
    nodes?: Array<{
      id: string;
      price: string;
    } | null>;
  };
  errors?: Array<{ message: string }>;
};

function variantGid(numericId: string): string {
  return `gid://shopify/ProductVariant/${numericId}`;
}

export async function fetchShopifyVariantPrices(variantIds: string[]): Promise<VariantPriceMap> {
  if (variantIds.length === 0) {
    return new Map();
  }

  const { storeDomain } = getShopifyConfig();
  const accessToken = await getShopifyAccessToken();
  const gids = variantIds.map(variantGid);

  const query = `
    query VariantPrices($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          price
        }
      }
    }
  `;

  const response = await fetch(shopifyAdminGraphqlUrl(storeDomain), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables: { ids: gids } }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify GraphQL request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as GraphqlNodesResponse;

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  const prices: VariantPriceMap = new Map();

  for (const node of payload.data?.nodes ?? []) {
    if (!node?.id || !node.price) continue;

    const numericId = node.id.split("/").pop();
    if (!numericId) continue;

    prices.set(numericId, roundMoney(Number(node.price)));
  }

  return prices;
}
