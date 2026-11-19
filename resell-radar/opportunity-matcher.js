(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResellRadarMatcher = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const STOP_WORDS = new Set(["edition", "collector", "limited", "video", "game", "games", "jeu", "jeux", "the", "and", "for", "with", "of", "le", "la", "les", "des", "du", "de", "sealed", "new", "brand"]);
  const EDITION_GROUPS = [["steelbook", "steel book"], ["standard"], ["collector"], ["deluxe"], ["ultimate"], ["limited"]];
  const PLATFORM_GROUPS = [["ps5", "playstation 5"], ["ps4", "playstation 4"], ["ps3", "playstation 3"], ["ps2", "playstation 2"], ["xbox series", "series x", "series s"], ["xbox one"], ["xbox 360"], ["switch", "nintendo switch"], ["wii u"], ["wii"], ["3ds"], ["ds"], ["pc", "steam"], ["gamecube"], ["n64", "nintendo 64"], ["nes"], ["snes"], ["megadrive", "mega drive"], ["dreamcast"]];
  const BLOCKER = /\b(lot|bundle|pack of|job lot|accessory|accessories|manual only|case only|box only|boite seule|without game|sans jeu|empty box)\b/i;

  function normalise(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function tokens(value) { return new Set(normalise(value).split(" ").filter(word => word.length > 2 && !STOP_WORDS.has(word))); }
  function detectedGroups(value, groups) { const title = normalise(value); return groups.map((group, index) => group.some(term => title.includes(normalise(term))) ? index : null).filter(index => index !== null); }
  function incompatible(a, b, groups) { const left = detectedGroups(a, groups), right = detectedGroups(b, groups); return left.length > 0 && right.length > 0 && !left.some(x => right.includes(x)); }
  function condition(value) {
    const title = normalise(value);
    if (/\b(sealed|factory sealed|brand new)\b/.test(title)) return "sealed";
    if (/\b(loose|disc only|cart only)\b/.test(title)) return "loose";
    if (/\b(complete|cib|complete in box)\b/.test(title)) return "complete";
    if (/\b(used|pre owned|preowned)\b/.test(title)) return "used";
    return null;
  }
  function titleMatch(activeTitle, soldTitle) {
    if (!activeTitle || !soldTitle || BLOCKER.test(normalise(activeTitle)) || BLOCKER.test(normalise(soldTitle))) return false;
    if (incompatible(activeTitle, soldTitle, EDITION_GROUPS) || incompatible(activeTitle, soldTitle, PLATFORM_GROUPS)) return false;
    const activeCondition = condition(activeTitle), soldCondition = condition(soldTitle);
    if (activeCondition && soldCondition && activeCondition !== soldCondition) return false;
    const active = tokens(activeTitle), sold = tokens(soldTitle);
    const shared = [...active].filter(word => sold.has(word));
    const union = new Set([...active, ...sold]).size;
    return shared.length >= 2 && shared.length / Math.max(1, union) >= 0.24;
  }
  function positiveNumber(value) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : null; }
  function hasKnownShipping(listing) {
    return positiveNumber(listing.totalPrice) !== null || positiveNumber(listing.shippingPrice) !== null;
  }
  function listingCost(listing) {
    const price = positiveNumber(listing.currentPrice ?? listing.price ?? listing.soldPrice);
    const shipping = positiveNumber(listing.shippingPrice);
    return price === null ? null : price + (shipping ?? 0);
  }
  function median(values) { const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }
  function quantile(values, percentile) {
    if (!Array.isArray(values) || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (sorted.length - 1) * percentile;
    const lower = Math.floor(index), upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }
  function estimateProfit({ resalePrice, acquisitionCost, feeRate, otherCosts }) {
    const value = resalePrice * (1 - feeRate) - acquisitionCost - otherCosts;
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
  return { titleMatch, hasKnownShipping, listingCost, median, quantile, estimateProfit };
});
