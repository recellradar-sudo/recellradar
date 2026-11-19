// Netlify Function: secure proxy for eBaySoldListingsAPI
// Configure EBAY_SOLD_API_KEY in Netlify environment variables.
// Browser clients never receive the provider key.
const ALLOWED_MARKETS = new Set(["ebay.fr","ebay.de","ebay.co.uk","ebay.com","ebay.it","ebay.es"]);
const ORIGIN = "https://resellradar.netlify.app";

export default async (request) => {
  const cors = {
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  if (request.headers.get("origin") && request.headers.get("origin") !== ORIGIN) return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
  const key = process.env.EBAY_SOLD_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: "Server provider key is not configured. Add EBAY_SOLD_API_KEY in Netlify environment variables." }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } }); }
  const keyword = String(body?.keyword || "").trim().slice(0, 120);
  const ebaySite = String(body?.ebaySite || "ebay.fr");
  if (!keyword) return new Response(JSON.stringify({ error: "keyword is required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  if (!ALLOWED_MARKETS.has(ebaySite)) return new Response(JSON.stringify({ error: "Unsupported marketplace" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const url = new URL("https://api.ebaysoldlistingsapi.com/scrape");
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("ebaySite", ebaySite);
    url.searchParams.set("count", "40");
    url.searchParams.set("sold", "true");
    url.searchParams.set("relevance", "true");
    const upstream = await fetch(url, { headers: { Authorization: "Bearer " + key }, signal: AbortSignal.timeout(20000) });
    const raw = await upstream.text();
    if (!upstream.ok) return new Response(JSON.stringify({ error: "Provider returned HTTP " + upstream.status, detail: raw.slice(0, 300) }), { status: upstream.status >= 500 ? 502 : upstream.status, headers: { ...cors, "Content-Type": "application/json" } });
    let data;
    try { data = JSON.parse(raw); } catch { return new Response(JSON.stringify({ error: "Provider returned invalid JSON" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } }); }
    return new Response(JSON.stringify(data), { status: 200, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.name === "TimeoutError" ? "Provider request timed out" : "Provider connection failed" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
  }
};
