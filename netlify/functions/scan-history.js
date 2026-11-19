exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "https://resellradar.netlify.app",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers, body: JSON.stringify({ error: "GET only" }) };
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: "Database is not configured." }) };
  }
  try {
    const url = process.env.SUPABASE_URL.replace(/\\/$/, "") + "/rest/v1/scan_history?select=id,created_at,keyword,marketplace,total_results,results&order=created_at.desc&limit=50";
    const response = await fetch(url, { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: "Database read failed", detail: (await response.text()).slice(0, 200) }) };
    return { statusCode: 200, headers, body: JSON.stringify({ scans: await response.json() }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "History endpoint failed", detail: String(error.message || error).slice(0, 200) }) };
  }
};
