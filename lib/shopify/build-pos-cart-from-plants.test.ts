import { describe, expect, it } from "vitest";
import {
  buildPestsSurchargePosCart,
  mergePestsSurchargeLineItems,
} from "@/lib/shopify/build-pos-cart-from-plants";
import { SHOPIFY_VARIANT_IDS } from "@/lib/shopify/config";
import type { PosCheckoutPayload } from "@/lib/shopify/pos-checkout-types";

const customer = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "07000000000",
  marketingConsent: true,
};

describe("buildPestsSurchargePosCart", () => {
  it("uses pests surcharge variant ids per size", () => {
    const built = buildPestsSurchargePosCart({
      plants: [
        { plantId: "11111111-1111-1111-1111-111111111111", size: "M" },
        { plantId: "22222222-2222-2222-2222-222222222222", size: "S" },
      ],
      customer,
      visitId: "33333333-3333-3333-3333-333333333333",
    });

    expect(built.success).toBe(true);
    if (!built.success) return;

    expect(built.payload.lineItems).toHaveLength(2);
    expect(built.payload.lineItems[0]?.variantId).toBe(
      SHOPIFY_VARIANT_IDS.M.pestsSurchargeVariantId,
    );
    expect(built.payload.lineItems[1]?.variantId).toBe(
      SHOPIFY_VARIANT_IDS.S.pestsSurchargeVariantId,
    );
  });
});

describe("mergePestsSurchargeLineItems", () => {
  it("appends only plants not already on the cart", () => {
    const existing: PosCheckoutPayload = {
      visitId: "v1",
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
      shopifyCustomerId: null,
      cartNote: "existing",
      lineItems: [
        {
          variantId: SHOPIFY_VARIANT_IDS.M.pestsSurchargeVariantId,
          quantity: 1,
          properties: [
            { name: "_hh_visit_id", value: "v1" },
            { name: "_hh_plant_id", value: "p1" },
          ],
        },
      ],
    };

    const next = buildPestsSurchargePosCart({
      plants: [
        { plantId: "p1", size: "M" },
        { plantId: "p2", size: "L" },
      ],
      customer,
      visitId: "v1",
    });
    expect(next.success).toBe(true);
    if (!next.success) return;

    const merged = mergePestsSurchargeLineItems(existing, next.payload);
    expect(merged.lineItems).toHaveLength(2);
  });
});
