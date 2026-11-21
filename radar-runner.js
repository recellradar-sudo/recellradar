const fs = require("node:fs/promises");
const { handler: soldScan } = require("./netlify/functions/sold-scan");
const matcher = require("./resell-radar/opportunity-matcher");

function deliveredPrice(listing) {
  const value = listing.bestOfferAccepted && listing.acceptedOfferPriceStatus === "found"
    ? listing.acceptedOfferPrice
    : listing.totalPrice ?? (Number(listing.soldPrice) + Number(listing.shippingPrice || 0));
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function findCandidates({ active, sold, condition = "all", feeRate = 0.135, otherCosts = 5.99, minProfit = 20 }) {
  const sameCondition = item => condition === "all" || matcher.classifyCondition(item) === condition;
  const activeRows = (active || []).filter(sameCondition).filter(matcher.hasKnownShipping);
  const soldRows = (sold || []).filter(sameCondition).map(listing => ({
    listing,
    price: deliveredPrice(listing),
    currency: String(listing.soldCurrency || listing.currency || "UNKNOWN").toUpperCase()
  })).filter(row => row.price !== null && row.currency !== "UNKNOWN" && matcher.hasKnownShipping(row.listing));

  return activeRows.map(listing => {
    const acquisitionCost = matcher.listingCost(listing);
    const format = String(listing.buyingFormat || "").toLowerCase();
    const currency = String(listing.currentCurrency || listing.currency || "UNKNOWN").toUpperCase();
    if (!listing.title || acquisitionCost === null || format.includes("auction") || currency === "UNKNOWN") return null;
    const comps = soldRows.filter(row => row.currency === currency && matcher.titleMatch(listing.title, row.listing.title));
    if (comps.length < 3) return null;
    const prices = comps.map(row => row.price);
    const q1 = matcher.quantile(prices, 0.25);
    const median = matcher.median(prices);
    const cautiousProfit = matcher.estimateProfit({ resalePrice: q1, acquisitionCost, feeRate, otherCosts });
    if (cautiousProfit < minProfit) return null;
    return {
      title: listing.title,
      url: listing.url || null,
      currency,
      acquisitionCost,
      soldComparables: comps.length,
      cautiousResaleQ1: q1,
      medianResale: median,
      cautiousProfit,
      medianProfit: matcher.estimateProfit({ resalePrice: median, acquisitionCost, feeRate, otherCosts })
    };
  }).filter(Boolean).sort((a, b) => b.cautiousProfit - a.cautiousProfit);
}

async function requestScan(keyword, marketplace, mode) {
  const response = await soldScan({ httpMethod: "POST", body: JSON.stringify({ keyword, marketplace, mode }) });
  const payload = JSON.parse(response.body);
  if (response.statusCode !== 200) throw new Error(payload.error || `Scan error (${response.statusCode})`);
  return payload;
}

async function scanTarget(target) {
  const keyword = String(target.keyword || "").trim();
  const marketplace = String(target.marketplace || "ebay.fr");
  if (!keyword) throw new Error("Chaque cible doit définir keyword.");
  if (marketplace === "world") throw new Error("Chaque cible doit utiliser un seul marché eBay, pas world.");
  const [active, sold] = await Promise.all([
    requestScan(keyword, marketplace, "active"),
    requestScan(keyword, marketplace, "sold")
  ]);
  return {
    keyword,
    marketplace,
    activeListings: Array.isArray(active.results) ? active.results.length : 0,
    completedSales: Array.isArray(sold.results) ? sold.results.length : 0,
    candidates: findCandidates({ active: active.results, sold: sold.results, ...target })
  };
}

async function main() {
  const file = process.argv[2] || "radar-targets.json";
  const config = JSON.parse(await fs.readFile(file, "utf8"));
  if (!Array.isArray(config.targets) || !config.targets.length) throw new Error("La configuration doit contenir au moins une cible.");
  const results = [];
  for (const target of config.targets) results.push(await scanTarget(target));
  process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2) + "\n");
}

if (require.main === module) main().catch(error => { console.error(`Radar local : ${error.message}`); process.exitCode = 1; });

module.exports = { findCandidates, scanTarget };

