import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckInCustomer } from "@/lib/check-in/customer-schema";
import { shopifyAdminGraphqlUrl, getShopifyAccessToken } from "@/lib/shopify/get-access-token";
import { getShopifyConfig, isShopifyPricingConfigured } from "@/lib/shopify/env";

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type CustomerSearchResult = {
  customers: {
    nodes: Array<{ id: string; email: string }>;
  };
};

type CustomerCreateResult = {
  customerCreate: {
    customer: { id: string } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

async function shopifyGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const { storeDomain } = getShopifyConfig();
  const accessToken = await getShopifyAccessToken();

  const response = await fetch(shopifyAdminGraphqlUrl(storeDomain), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify GraphQL failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as GraphqlResponse<T>;

  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }

  if (!json.data) {
    throw new Error("Shopify GraphQL returned no data.");
  }

  return json.data;
}

function numericCustomerId(gid: string): string {
  const match = gid.match(/(\d+)$/);
  return match?.[1] ?? gid;
}

export type UpsertShopifyCustomerResult =
  | { success: true; shopifyCustomerId: string }
  | { success: false; error: string };

export async function upsertShopifyCustomerByEmail(
  customer: CheckInCustomer,
): Promise<UpsertShopifyCustomerResult> {
  if (!isShopifyPricingConfigured()) {
    return { success: false, error: "Shopify is not configured." };
  }

  const email = customer.email.trim().toLowerCase();

  try {
    const search = await shopifyGraphql<CustomerSearchResult>(
      `query CustomerByEmail($query: String!) {
        customers(first: 1, query: $query) {
          nodes { id email }
        }
      }`,
      { query: `email:${email}` },
    );

    const existing = search.customers.nodes[0];
    if (existing?.id) {
      return { success: true, shopifyCustomerId: numericCustomerId(existing.id) };
    }

    const created = await shopifyGraphql<CustomerCreateResult>(
      `mutation CustomerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer { id }
          userErrors { field message }
        }
      }`,
      {
        input: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email,
          phone: customer.phone || undefined,
        },
      },
    );

    const userError = created.customerCreate.userErrors[0];
    if (userError) {
      return { success: false, error: userError.message };
    }

    const id = created.customerCreate.customer?.id;
    if (!id) {
      return { success: false, error: "Shopify did not return a customer id." };
    }

    return { success: true, shopifyCustomerId: numericCustomerId(id) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify customer sync failed";
    return { success: false, error: message };
  }
}

export async function saveShopifyCustomerIdOnRecord(
  supabase: SupabaseClient,
  customerId: string,
  shopifyCustomerId: string,
): Promise<void> {
  await supabase
    .from("customers")
    .update({ shopify_customer_id: shopifyCustomerId })
    .eq("id", customerId);
}
