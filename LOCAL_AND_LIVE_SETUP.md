# DRiV Parts Finder — local and live setup

## What changed
- Country mapping from the uploaded legacy `CountryCode.java`: US=1,2, MX=1,3, CA=1,4 (unknown defaults to US).
- Existing API routes remain `/api/catalog/{health,years,makes,models,parts}`.
- Existing Fastly package, health endpoint, and weather sample retained.
- Cloud config includes a `pdm_api` origin, config entries and a secret reference.
- CDN routes catalog paths to the existing `my-edge-function` name.
- EDS block supports Year → Make → Model → Parts with cautious JSON response mapping.

## Local
1. Extract this ZIP. Copy files into your local repository after making a backup or a Git branch.
2. `npm ci` (Node.js 20+).
3. Set up a **valid, approved PDM development credential** using your local secret store configuration. `fastly.toml` contains a placeholder only. Never commit actual tokens.
4. `aio aem edge-functions serve`
5. `curl -i http://127.0.0.1:7676/api/catalog/health`
6. `curl -i -G http://127.0.0.1:7676/api/catalog/years --data-urlencode 'brand=corporate' --data-urlencode 'locale=en_US' --data-urlencode 'country_code=US' --data-urlencode 'vehicle_group_ids=2,8'`
7. `npm test`

### EDS frontend
Copy `eds-block/parts-finder.js` and `eds-block/parts-finder.css` to **the other repository** at `mysite/blocks/parts-finder/`. Create a `Parts Finder` block in your EDS content. The frontend uses `http://127.0.0.1:7676` only on localhost; other hosts use same-origin `/api/catalog`. For localhost on different ports, add a restrictive development-only CORS policy or use a same-origin local proxy. The production CDN route must be deployed first.

## Live / Cloud Manager
1. Confirm the EDS site and Cloud Manager program support Edge Functions, and check your organization's existing CDN config before replacing anything.
2. Have the PDM owner rotate any exposed credentials and issue an authorized development/production token.
3. Configure the Cloud Manager secret `DRIV_PDM_API_TOKEN`; the `config/edgeFunctions.yaml` reference must match the actual secret name.
4. Verify `config/edgeFunctions.yaml` origin and Fastly backend hostname are the same PDM environment as the approved token.
5. Verify the exact current Edge Functions config schema in your Cloud Manager program; these files are prepared examples, not proof that deployment is enabled.
6. Merge `config/cdn.yaml` into the site's authoritative CDN configuration; do not overwrite unrelated rules.
7. Build/deploy using the Adobe Edge Functions workflow enabled in your program, then deploy CDN config and verify `/api/catalog/health` on your real site.
8. Test Years, then Make/Model/Parts. Only publish the EDS block after those endpoints return valid JSON.

## Known blockers / not yet verified
- Upstream returned HTTP **401** with the provided placeholder token. This ZIP cannot fix credentials; no real secret is included.
- The legacy **Years PDM service implementation** was not provided. Upstream paths and parameter mapping in `src/catalog.js` are inherited from your ZIP, not independently verified against PDM.
- `PDM_DYNAMIC_SUB_CONFIG_TYPES` remains blank; Parts may return a configuration error until you confirm the actual legacy value.
- DTO shape is not known. The EDS block maps common array shapes and shows raw JSON if mapping is not recognized.
- The local frontend may encounter CORS unless served through a proxy or configured for dev CORS.
- Do not expose real tokens in logs, chat, source files or committed `fastly.toml`.
