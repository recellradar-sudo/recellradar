# Resell Radar

Interface et radar local pour l’API eBay Sold Listings (fournisseur tiers expérimental).

## Exécution locale
This repository includes a small Node launcher, so the static interface and the server-side scanner can run on the same computer without a Netlify deploy.

In PowerShell, from the repository folder:

```powershell
$env:EBAY_SOLD_API_KEY = "paste-your-new-key-here"
node local-server.js
```

Open http://127.0.0.1:8888 in a browser. The key exists only for that PowerShell session: it is not written to a file or committed to Git. Close the PowerShell window to stop the local server. If you do not set the key, the app still opens but live scans remain disabled.

## Radar local en ligne de commande
1. Copie `radar-targets.example.json` vers `radar-targets.json`, puis remplace l’exemple par tes références précises. Ce fichier est ignoré par Git.
2. Dans la même session PowerShell où `EBAY_SOLD_API_KEY` est défini, lance :

```powershell
node radar-runner.js radar-targets.json
```

Le radar écrit un rapport JSON sur la sortie standard, sans enregistrer de résultat ni de clé. Une opportunité exige au moins trois ventes terminées comparables dans la même devise, des frais de livraison connus, un prix prudent Q1 et le bénéfice minimum configuré. Une liste vide est un résultat valide : aucune ligne n’est inventée.

## Scanner
- POST JSON: `{ "keyword": "...", "marketplace": "ebay.fr" }`
- Supported marketplace IDs: ebay.fr, ebay.de, ebay.co.uk, ebay.com, ebay.it, ebay.es, ebay.ca, ebay.com.au
- Provider response is passed through as sold results and usage-remaining metadata; no mock rows are generated.
- La clé API est définie uniquement dans la session PowerShell locale.

## Prototype limitations
Dashboard/opportunity rows, release calendar, scores and market indicators are still sample/demo data. Watchlist and portfolio state remain browser-local. There is no remote database, scheduled scanning, Gmail sending or user authentication yet.


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
- The opportunity comparison runs one marketplace at a time. The `Monde` selector is available for raw completed-sales research only; it is deliberately blocked for a margin comparison so that prices in different currencies are never combined or presented as comparable.
- Candidate ranking uses the first quartile (Q1) of matched completed sales, not their median. The median remains visible as an upside scenario; it does not decide whether the listing clears the minimum-profit threshold.
- The matcher and profit calculation have Node tests in `netlify/functions/lib/tests/opportunity-matcher.test.js`; run all analytics tests with `node --test netlify/functions/lib/tests/*.test.js`.

## World marketplace mode
The `Monde` option queries all eight marketplaces supported by the provider (France, Germany, UK, US, Italy, Spain, Canada and Australia) with international item location enabled. One world scan uses eight provider requests. Results retain their marketplace and local currency; the app does not combine currencies into one price statistic.
