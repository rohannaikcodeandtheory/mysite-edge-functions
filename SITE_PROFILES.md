# Site-aware EDS Parts Finder

The EDS block now offers four reference website profiles: DRiV North America, DRiV Germany, MOOG North America, MOOG Europe. Profiles set a *frontend* brand, country and locale; they do **not** prove a particular PDM brand-code mapping.

## Postman example codes
- `BDCM` — shown in years/makes/models examples
- `BDCN,BCKM` — shown in equipment API examples
- `BBKH` — shown in concatenated equipment models example

The dropdown defaults to **Use configured mapping**. Selecting any example sends `brand_codes` explicitly, overriding the server mapping for diagnostics only. A custom option is also provided. Never put the PDM token in the frontend.

## Critical EMEA limitation
The supplied PDM Edge Functions configuration is for the North American API. The German and European reference pages expose other catalog flows (vehicle type, plate, VIN, part number, engine, axle). Their API host, endpoints, region IDs, brand codes, and response schema are not established by the supplied NA Postman examples. This is a UI configuration prototype, not a verified EMEA backend integration.

## EDS installation
Copy `eds-block/parts-finder.js` and `.css` to your EDS repo `blocks/parts-finder/parts-finder.js` and `blocks/parts-finder/parts-finder.css`, then create a page with a `Parts Finder` block. Ensure `/api/catalog/*` routes to your Edge Function or use the Local API option. On a hosted HTTPS page, browsers may block requests to HTTP localhost (mixed content/private-network/CORS); test through a same-origin proxy where possible.

## Manual testing
1. Start Edge Functions with `aio aem edge-functions serve`.
2. Select DRiV North America, choose a vehicle group and test Years, Makes, Models, then Parts.
3. Switch to MOOG North America; first use the configured mapping (requires `PDM_BRAND_CODES_MOOG`), or select `BDCM` for *illustrative diagnostic testing only*.
4. Switch to German or European profiles to verify UI state changes, **not** to assert live PDM compatibility.
5. Compare network requests, HTTP status and returned JSON with the real reference site and the AEM configuration before production use.
