const test = require("node:test");
const assert = require("node:assert/strict");
const { findCandidates } = require("../../../../radar-runner");

test("keeps currencies separate and only returns a cautious profitable candidate", () => {
  const active = [{ title: "Zelda Collector Edition Switch sealed", currentPrice: 70, shippingPrice: 5, currentCurrency: "EUR", buyingFormat: "Buy It Now", url: "https://www.ebay.fr/itm/1" }];
  const sold = [
    { title: "Zelda Collector Edition Nintendo Switch sealed", totalPrice: 150, shippingPrice: 0, soldCurrency: "EUR" },
    { title: "Zelda Collector Edition Switch factory sealed", totalPrice: 160, shippingPrice: 0, soldCurrency: "EUR" },
    { title: "Zelda Collector Edition Switch sealed", totalPrice: 170, shippingPrice: 0, soldCurrency: "EUR" },
    { title: "Zelda Collector Edition Switch sealed", totalPrice: 900, shippingPrice: 0, soldCurrency: "USD" }
  ];
  const candidates = findCandidates({ active, sold, minProfit: 20, otherCosts: 5.99 });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].currency, "EUR");
  assert.equal(candidates[0].soldComparables, 3);
  assert.ok(candidates[0].cautiousProfit >= 20);
});

