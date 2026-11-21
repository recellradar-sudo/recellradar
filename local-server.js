const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { handler: soldScan } = require("./netlify/functions/sold-scan");
const { scanTarget } = require("./radar-runner");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 8888);
const publicDirectory = path.join(__dirname, "resell-radar");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(response, statusCode, headers, body) {
  response.writeHead(statusCode, headers);
  response.end(body);
}

async function requestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function serveStatic(request, response) {
  const requestPath = new URL(request.url, `http://${host}`).pathname;
  const relativePath = requestPath === "/" ? "index.html" : decodeURIComponent(requestPath).replace(/^\/+/, "");
  const filePath = path.resolve(publicDirectory, relativePath);
  if (!filePath.startsWith(`${publicDirectory}${path.sep}`) && filePath !== path.join(publicDirectory, "index.html")) {
    return send(response, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Forbidden");
  }
  try {
    const content = await fs.readFile(filePath);
    send(response, 200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" }, content);
  } catch (error) {
    if (error.code === "ENOENT") return send(response, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
    return send(response, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Unable to read local file");
  }
}

http.createServer(async (request, response) => {
  const requestPath = new URL(request.url, `http://${host}`).pathname;
  if (requestPath === "/api/health") {
    return send(response, 200, { "Content-Type": "application/json" }, JSON.stringify({ local: true, providerConfigured: Boolean(process.env.EBAY_SOLD_API_KEY) }));
  }
  if (requestPath === "/api/radar-run") {
    if (request.method !== "POST") return send(response, 405, { "Content-Type": "application/json" }, JSON.stringify({ error: "POST only" }));
    try {
      const payload = JSON.parse(await requestBody(request));
      const targets = Array.isArray(payload.targets) ? payload.targets.slice(0, 20) : [];
      if (!targets.length) return send(response, 400, { "Content-Type": "application/json" }, JSON.stringify({ error: "Ajoute au moins une cible." }));
      const results = [];
      for (const target of targets) results.push(await scanTarget(target));
      return send(response, 200, { "Content-Type": "application/json" }, JSON.stringify({ generatedAt: new Date().toISOString(), results }));
    } catch (error) {
      return send(response, 502, { "Content-Type": "application/json" }, JSON.stringify({ error: String(error.message || error).slice(0, 250) }));
    }
  }
  if (requestPath === "/api/scan" || requestPath === "/.netlify/functions/sold-scan") {
    const result = await soldScan({ httpMethod: request.method, body: await requestBody(request) });
    return send(response, result.statusCode, result.headers, result.body);
  }
  return serveStatic(request, response);
}).listen(port, host, () => {
  console.log(`Resell Radar local: http://${host}:${port}`);
  console.log(process.env.EBAY_SOLD_API_KEY ? "Data provider key: configured for this session" : "Data provider key: not configured (the interface still opens)");
});

