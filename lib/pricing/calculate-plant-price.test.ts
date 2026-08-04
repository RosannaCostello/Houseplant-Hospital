import { describe, expect, it } from "vitest";
import { calculatePlantPrice } from "@/lib/pricing/calculate-plant-price";

describe("calculatePlantPrice", () => {
  it("adds absolute pests surcharge lines", () => {
    const result = calculatePlantPrice({
      size: "M",
      baseAmount: 40,
      pricingModifier: 0,
      adjustments: [
        {
          adjustmentType: "bugs_surcharge",
          amount: 15,
          percent: null,
          reason: "Pests treatment (Shopify)",
        },
      ],
    });

    expect(result.baseAmount).toBe(40);
    expect(result.totalAmount).toBe(55);
    expect(result.lines).toHaveLength(1);
  });
});
