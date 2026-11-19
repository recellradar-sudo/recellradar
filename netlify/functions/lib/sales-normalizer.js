function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function quantile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q, lo = Math.floor(index), hi = Math.ceil(index);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}
function normalizeSales(results) {
  const rows = (Array.isArray(results) ? results : []).map((x) => {
    const accepted = x.bestOfferAccepted && x.acceptedOfferPriceStatus === "found" ? numeric(x.acceptedOfferPrice) : null;
    const sold = numeric(x.soldPrice);
    const total = numeric(x.totalPrice);
    const shipping = x.shippingPrice === 0 || x.shippingPrice === "0" ? 0 : numeric(x.shippingPrice);
    const price = accepted ?? total ?? (sold !== null ? sold + (shipping ?? 0) : null);
    const currency = String(x.soldCurrency || x.currency || "UNKNOWN").toUpperCase();
    return { price, currency, shippingKnown: total !== null || shipping !== null, bestOffer: Boolean(x.bestOfferAccepted), raw: x };
  }).filter(x => x.price !== null);
  const groups = {};
  for (const row of rows) (groups[row.currency] ||= []).push(row);
  const currencies = Object.entries(groups).map(([currency, items]) => {
    const prices = items.map(x => x.price);
    return { currency, sampleSize: items.length, median: median(prices), q1: quantile(prices, .25), q3: quantile(prices, .75), min: Math.min(...prices), max: Math.max(...prices), shippingUnknownCount: items.filter(x => !x.shippingKnown).length, bestOfferCount: items.filter(x => x.bestOffer).length };
  }).sort((a,b) => b.sampleSize-a.sampleSize);
  return { totalRecords: Array.isArray(results) ? results.length : 0, pricedRecords: rows.length, unpricedRecords: (Array.isArray(results) ? results.length : 0)-rows.length, currencies, warning: currencies.length > 1 ? "Multiple currencies detected. Statistics are separated by currency; do not compare or combine them." : null };
}
module.exports = { normalizeSales };
