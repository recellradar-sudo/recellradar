const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeSales } = require("../sales-normalizer");

test("prefers total price and separates currencies", () => {
  const stats = normalizeSales([
    { soldPrice: 10, shippingPrice: 5, totalPrice: 18, soldCurrency: "EUR" },
    { soldPrice: 12, soldCurrency: "EUR" },
    { soldPrice: 20, soldCurrency: "USD" }
  ]);
  assert.equal(stats.pricedRecords, 3);
  assert.equal(stats.currencies.length, 2);
  const eur = stats.currencies.find(x => x.currency === "EUR");
  assert.equal(eur.sampleSize, 2);
  assert.equal(eur.median, 15);
  assert.equal(eur.shippingUnknownCount, 1);
  assert.match(stats.warning, /Multiple currencies/);
});

test("reports missing prices and best-offer rows", () => {
  const stats = normalizeSales([
    { soldPrice: 25, shippingPrice: 4, soldCurrency: "GBP", bestOfferAccepted: true },
    { title: "no price" }
  ]);
  assert.equal(stats.pricedRecords, 1);
  assert.equal(stats.unpricedRecords, 1);
  assert.equal(stats.currencies[0].median, 29);
  assert.equal(stats.currencies[0].bestOfferCount, 1);
});

test("zero shipping is reported as known", () => {
  const stats = normalizeSales([{ soldPrice: 40, shippingPrice: 0, soldCurrency: "EUR" }]);
  assert.equal(stats.currencies[0].median, 40);
  assert.equal(stats.currencies[0].shippingUnknownCount, 0);
});

test("counts rows whose shipping amount is unknown", () => {
  const stats = normalizeSales([{ soldPrice: 40, soldCurrency: "EUR" }]);
  assert.equal(stats.currencies[0].shippingUnknownCount, 1);
});

test("uses accepted Best Offer price when provider confirms it", () => {
  const stats = normalizeSales([
    { soldPrice: 200, totalPrice: 210, soldCurrency: "EUR", bestOfferAccepted: true, acceptedOfferPrice: "175.00", acceptedOfferPriceStatus: "found" },
    { soldPrice: 190, soldCurrency: "EUR", bestOfferAccepted: true, acceptedOfferPrice: null, acceptedOfferPriceStatus: "pending" }
  ]);
  assert.equal(stats.currencies[0].sampleSize, 2);
  assert.equal(stats.currencies[0].median, 182.5);
  assert.equal(stats.currencies[0].bestOfferCount, 2);
});
