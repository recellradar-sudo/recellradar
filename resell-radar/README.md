# Resell Radar

Static interactive demo with a Netlify serverless endpoint for the eBay Sold Listings API (experimental third-party provider).

## Deploy on Netlify
- Netlify config is in root `netlify.toml` (publish directory `resell-radar`, functions directory `netlify/functions`).
- Configure environment variable `EBAY_SOLD_API_KEY` in Netlify site settings (Site configuration → Environment variables). Never paste the key into the app/browser.
- Trigger a deploy after adding the variable. The scanner calls `/.netlify/functions/sold-scan` (also exposed through the legacy `/api/sold-search` redirect).
- If Netlify's deploy settings are manually overriding the publish/functions paths, align them with the root `netlify.toml`.

## Run locally (without Netlify)
This repository includes a small Node launcher, so the static interface and the server-side scanner can run on the same computer without a Netlify deploy.

In PowerShell, from the repository folder:

```powershell
$env:EBAY_SOLD_API_KEY = "paste-your-new-key-here"
node local-server.js
```

Open http://127.0.0.1:8888 in a browser. The key exists only for that PowerShell session: it is not written to a file or committed to Git. Close the PowerShell window to stop the local server. If you do not set the key, the app still opens but live scans remain disabled.

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


## Normalized sold-sales analytics
- The scan response now includes `normalizedStats`, calculated from the provider's raw results.
- Sale totals are grouped by currency; currencies are never merged into one statistic.
- `totalPrice` is preferred; otherwise sold price plus shipping is used when shipping is reported. Missing shipping is flagged in each currency group.
- Each currency group exposes sample size, median, quartiles (Q1/Q3), min/max, count with shipping unknown, and Best Offer rows.
- Raw `results` remain included for audit/export. This is statistical normalization, not edition matching or a resale forecast.
- Unit tests are included in `netlify/functions/lib/tests/sales-normalizer.test.js` (run with Node's test runner when available).


## Sold-comp margin estimator
- The Live Market Search scan includes a scenario calculator for maximum buy price.
- It uses same-currency sold samples only, and displays a conservative Q1 reference and a median reference.
- Editable inputs: estimated marketplace fee percentage, outbound shipping, other costs, and target net profit.
- The result is a scenario, not a buy signal: verify edition, completeness, condition, shipping, and liquidity before buying.

## Sold-comp opportunity calculator
After a sold-listings scan, the interface displays separate currency statistics and a margin scenario calculator: Q1 (cautious), median, and Q3 (optimistic) max-buy prices. Enter your own purchase price to estimate net profit at Q1 and median references. Marketplace fees, seller shipping, packaging/miscellaneous costs, and target profit are assumptions and must be edited to match the transaction. The calculation is not a purchase recommendation; inspect comparability, condition, completeness, Best Offer pricing and shipping uncertainty.

## Active listing vs sold-comp opportunity scan
- The server endpoint now accepts `mode: "active"` to retrieve current asking listings (`sold=false`) or `mode: "sold"` for completed sales. The API provider documents both modes on the same `/scrape` endpoint.
- The Live Market Search view has a comparison button that fetches both sets, computes the sold-price median and ranks live asking prices by a rough profit estimate (median × 86.5% − asking price − €5.99 assumed misc cost).
- The comparison is deliberately labeled **unverified**: it compares search-wide samples, not exact product editions/condition, assumes a 13.5% sale fee and €5.99 of other costs, and does not verify sell-through/liquidity. It only uses active listings and sold comparables for which the provider supplied shipping, so missing shipping cannot silently become €0. It is a candidate triage, not a buy signal.
- API docs: https://ebaysoldlistingsapi.com/docs/active-listings and https://ebaysoldlistingsapi.com/docs/sold-search
- Sold scans request `bestOfferPrice=true` and the normalizer prefers `acceptedOfferPrice` when its status is `found`; unresolved offers still fall back to the original price and remain a market-price upper-bound risk.
- Opportunity comparisons require at least 3 title-matched sold rows, reject lot/accessory-like listings, guard explicit edition, condition and platform differences, and exclude active auctions. These heuristics reduce some false matches but do not prove SKU-level identity.
- Candidate ranking uses the first quartile (Q1) of matched completed sales, not their median. The median remains visible as an upside scenario; it does not decide whether the listing clears the minimum-profit threshold.
- The matcher and profit calculation have Node tests in `netlify/functions/lib/tests/opportunity-matcher.test.js`; run all analytics tests with `node --test netlify/functions/lib/tests/*.test.js`.
