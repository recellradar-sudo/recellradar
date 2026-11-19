# Resell Radar

Static interactive demo with a Netlify serverless endpoint for the eBay Sold Listings API (experimental third-party provider).

## Deploy on Netlify
- Netlify config is in root `netlify.toml` (publish directory `resell-radar`, functions directory `netlify/functions`).
- Configure environment variable `EBAY_SOLD_API_KEY` in Netlify site settings (Site configuration → Environment variables). Never paste the key into the app/browser.
- Trigger a deploy after adding the variable. The scanner calls `/api/sold-search`, redirected to the `sold-search` Netlify Function by `netlify.toml`.
- If Netlify's deploy settings are manually overriding the publish/functions paths, align them with the root `netlify.toml`.

## Scanner
- POST JSON: `{ "keyword": "...", "ebaySite": "ebay.fr" }`
- Supported marketplace IDs: ebay.fr, ebay.de, ebay.co.uk, ebay.com, ebay.it, ebay.es
- Provider response is passed through as sold results and usage-remaining metadata; no mock rows are generated.
- API key is server-side only via Netlify environment variable.

## Prototype limitations
Dashboard/opportunity rows, release calendar, scores and market indicators are still sample/demo data. Watchlist and portfolio state remain browser-local. There is no remote database, scheduled scanning, Gmail sending or user authentication yet.
