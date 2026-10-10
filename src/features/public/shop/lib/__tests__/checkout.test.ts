import {
  buildValidatedCartItems,
  type CheckoutProductRecord,
} from "@/features/public/shop/lib/checkout";

describe("buildValidatedCartItems", () => {
  const baseProduct: CheckoutProductRecord = {
    branch_id: "branch-1",
    currency: "AED",
    id: "product-1",
    images: [],
    is_active: true,
    name: "Brow Serum",
    price_display: "AED 100",
    price_value: 100,
    slug: "brow-serum",
    unit_price: 100,
  };

  it("builds line items when the product has a selling branch", () => {
    const result = buildValidatedCartItems(
      [{ productId: "product-1", quantity: 2 }],
      [baseProduct],
    );

    expect(result).toEqual([
      expect.objectContaining({
        productId: "product-1",
        quantity: 2,
        lineTotalAmountCents: 20000,
      }),
    ]);
  });

  it("rejects products without a selling branch", () => {
    expect(() =>
      buildValidatedCartItems(
        [{ productId: "product-1", quantity: 1 }],
        [{ ...baseProduct, branch_id: null }],
      ),
    ).toThrow("One or more products in your cart are unavailable.");
  });
});
