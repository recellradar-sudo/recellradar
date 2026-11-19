const { normalizeSales } = require("./lib/sales-normalizer");

exports.handler = async (event) => {
  const allowedOrigin = "https://resellradar.netlify.app";
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod === "GET") return { statusCode: 200, headers, body: JSON.stringify({ backend: "online", providerConfigured: Boolean(process.env.EBAY_SOLD_API_KEY), provider: "eBaySoldListingsAPI", database: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) ? "configured" : "not-configured", email: "not-configured" }) };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  const apiKey = process.env.EBAY_SOLD_API_KEY;
  if (!apiKey) return { statusCode: 503, headers, body: JSON.stringify({ error: "Server API key is not configured. Set EBAY_SOLD_API_KEY in Netlify environment variables." }) };
  try {
    const body = JSON.parse(event.body || "{}");
    const keyword = String(body.keyword || "").trim().slice(0, 120);
    const marketplace = String(body.marketplace || "ebay.fr");
    const allowed = new Set(["ebay.fr", "ebay.de", "ebay.co.uk", "ebay.com", "ebay.it", "ebay.es"]);
    if (!keyword) return { statusCode: 400, headers, body: JSON.stringify({ error: "Keyword is required." }) };
    if (!allowed.has(marketplace)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Unsupported marketplace." }) };
    const mode = body.mode === "active" ? "active" : "sold";
    const apiUrl = "https://api.ebaysoldlistingsapi.com/scrape?keyword=" + encodeURIComponent(keyword) + "&ebaySite=" + encodeURIComponent(marketplace) + "&count=40&sold=" + (mode === "sold" ? "true" : "false") + "&relevance=true";
    const response = await fetch(apiUrl, { headers: { Authorization: "Bearer " + apiKey }, signal: AbortSignal.timeout(20000) });
    const raw = await response.text();
    if (!response.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: "Sold listings provider returned HTTP " + response.status, detail: raw.slice(0, 300) }) };
    let data;
    try { data = JSON.parse(raw); } catch { return { statusCode: 502, headers, body: JSON.stringify({ error: "Provider response was not valid JSON." }) }; }
    const results = Array.isArray(data.results) ? data.results : [];
    const normalizedStats = mode === "sold" ? normalizeSales(results) : null;
    let historySaved = false;
    if (mode === "sold" && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const save = await fetch(process.env.SUPABASE_URL.replace(/\\/$/, "") + "/rest/v1/scan_history", {
          method: "POST",
          headers: { "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY, "Authorization": "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify({ keyword, marketplace, total_results: data.totalResults ?? results.length, results })
        });
        historySaved = save.ok;
      } catch (_) { historySaved = false; }
    }
    return { statusCode: 200, headers, body: JSON.stringify({ mode, ebaySite: data.ebaySite || marketplace, totalResults: data.totalResults, results, normalizedStats, usageRemaining: response.headers.get("X-Usage-Remaining") || null, historySaved }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Scanner proxy error", detail: String(err.message || err).slice(0, 250) }) };
  }
};
