const test = require("node:test");
const assert = require("node:assert/strict");
const { titleMatch, hasKnownShipping, listingCost, median, quantile, estimateProfit } = require("../../../../resell-radar/opportunity-matcher");

test("matches equivalent editions and rejects conflicting platform, edition and condition", () => {
  assert.equal(titleMatch("Zelda Tears of the Kingdom Collector Edition Switch sealed", "Zelda Tears Kingdom collector Nintendo Switch factory sealed"), true);
  assert.equal(titleMatch("Zelda Collector Edition PS5", "Zelda Collector Edition Switch"), false);
  assert.equal(titleMatch("Zelda Deluxe Edition PS5", "Zelda Standard Edition PS5"), false);
  assert.equal(titleMatch("Zelda Collector Edition sealed", "Zelda Collector Edition used"), false);
});

test("rejects lots and accounts for active-listing shipping in acquisition cost", () => {
  assert.equal(titleMatch("Zelda Collector Edition", "Zelda Collector Edition bundle with case"), false);
  assert.equal(listingCost({ currentPrice: "80", shippingPrice: "12.50" }), 92.5);
  assert.equal(listingCost({ currentPrice: 80 }), 80);
  assert.equal(hasKnownShipping({ currentPrice: 80, shippingPrice: 0 }), true);
  assert.equal(hasKnownShipping({ currentPrice: 80 }), false);
});

test("calculates a transparent median-based net estimate", () => {
  assert.equal(median([80, 100, 120]), 100);
  assert.equal(quantile([80, 100, 120, 160], .25), 95);
  assert.equal(estimateProfit({ resalePrice: 100, acquisitionCost: 62, feeRate: 0.135, otherCosts: 5.99 }), 18.51);
});
