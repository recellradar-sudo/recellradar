# Resell Radar

Static interactive demo with a Netlify serverless endpoint for the eBay Sold Listings API (experimental third-party provider).

## Deploy on Netlify
- Netlify config is in root `netlify.toml` (publish directory `resell-radar`, functions directory `netlify/functions`).
- Configure environment variable `EBAY_SOLD_API_KEY` in Netlify site settings (Site configuration → Environment variables). Never paste the key into the app/browser.
- Trigger a deploy after adding the variable. The scanner calls `/.netlify/functions/sold-scan` (also exposed through the legacy `/api/sold-search` redirect).
- If Netlify's deploy settings are manually overriding the publish/functions paths, align them with the root `netlify.toml`.

## Scanner
- POST JSON: `{ "keyword": "...", "marketplace": "ebay.fr" }`
- Supported marketplace IDs: ebay.fr, ebay.de, ebay.co.uk, ebay.com, ebay.it, ebay.es
- Provider response is passed through as sold results and usage-remaining metadata; no mock rows are generated.
- API key is server-side only via Netlify environment variable.

## Prototype limitations
Dashboard/opportunity rows, release calendar, scores and market indicators are still sample/demo data. Watchlist and portfolio state remain browser-local. There is no remote database, scheduled scanning, Gmail sending or user authentication yet.


## Optional scan-history database (Supabase)
1. In Supabase, create a project and open SQL Editor.
2. Run the SQL in supabase/schema.sql to create the scan_history table.
3. In Netlify environment variables, add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-side only). Never expose the service-role key in the frontend.
4. Redeploy. Successful sold scans attempt to save their search and returned sample to scan_history. The Settings screen reports whether database credentials are configured, and the Scan History page lists recent scans.
5. Without Supabase configured, scans still work but are not persisted.
