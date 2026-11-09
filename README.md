# DRiV Parts Finder — AEM Edge Functions / PDM integration

**Scope:** Migration of the PDM catalog API layer from AEM Java services to Adobe Edge Delivery Services (EDS) + Fastly Compute Edge Functions. This project provides a secure backend API and an **EDS diagnostic/test block**, not a fully equivalent production storefront. It is compared against the supplied `NACatalogVehicleServiceImpl.java`, `NACatalogVehiclePDMApiServiceImpl.java` and `NACatalogPDMApiBaseServiceImpl.java`.

**PDM NA Catalog origin:** `https://driv-search-api-os-cache.pdm-automotive.com` with base path `/v1`. This is distinct from the older `https://api.pdm-automotive.com/api/v1` B2C URL.

## 1. Project structure and each file's purpose

| File | Purpose / execution |
|---|---|
| `src/index.js` | Fastly `fetch` entry point. Selects catalog routes, loads Fastly Config Store `config_default` and Secret Store via `SecretStoreManager`, calls `handleCatalog`, sends PDM fetch via named backend `pdm_api`. Does not read token for health, invalid methods or unknown routes. |
| `src/catalog.js` | **Pure request builder**: translates website-style query parameters to validated PDM URLs. Contains route mapping, brand resolution, country/region, vehicle IDs, search, parts, GPI VCDB, and engine filters. No network or secrets. |
| `src/country.js` | Maps website `US`, `CA`, `MX` to configured historical region IDs. **Mappings must be confirmed against legacy `NACatalogUtil`.** Unsupported countries are rejected. |
| `src/handler.js` | HTTP request handler, validation/error mapping, request IDs, timeout, upstream JSON checks, sorting of Years/Makes/Models, structured logs, response forwarding. |
| `src/lib/config.js` | Existing Fastly Secret Store manager (cloud bundled `secrets` JSON or individual local secret). Secret name **`PDM_API_TOKEN` remains unchanged**. Sanitized error logging. |
| `src/lib/log.js` | Legacy logging helper; avoid logging raw headers or secrets. Catalog routes use the structured logger in `handler.js`. |
| `config/edgeFunctions.yaml` | Adobe Edge Functions cloud deployment configuration: PDM origin, config store values and existing secret reference. Verify YAML schema and function name with your Adobe environment. |
| `config/cdn.yaml` | CDN origin-selection rules forwarding `/api/catalog/*` to `edgefunction-my-edge-function`. Weather/demo rules remain from the starter. |
| `fastly.config.example.toml` | **Non-secret merge reference** for local backend/config values. Not a full Fastly manifest; do not replace your existing `fastly.toml`. |
| `eds-block/parts-finder.js` | EDS test block: selectable local/deployed origin, Year → Make → Model → Parts flow, direct endpoint tester, HTTP status, timing, request ID, JSON. |
| `eds-block/parts-finder.css` | Styling for the diagnostic block. |
| `test/catalog.test.js` | Node unit tests using mocked PDM responses. No real PDM calls or token required. |
| `test/response-test.js` | Original response utility test from starter project. |
| `package.json`, `package-lock.json` | Node test tooling/dependencies. |
| `MIGRATION_SETUP.md` | Supplemental migration checklist and known limitations. |

**Not packaged:** `fastly.toml`, `.git/`, `node_modules/`, `bin/main.wasm`, production credentials. Preserve your existing local manifest and its `PDM_API_TOKEN` entry. The ZIP is a clean source package to merge into your existing project.

## 2. Prerequisites

1. Mac with Terminal (zsh), Git, Node.js **20+**, npm.
2. Existing `mysite-edge-functions` project with its working `fastly.toml`, Fastly local runtime and Adobe CLI (`aio`) already set up. Install/verify the Adobe CLI according to your organization's approved Adobe Edge Functions onboarding; do not assume `aio aem edge-functions serve` is available until verified.
3. PDM API access and an existing `PDM_API_TOKEN` in the configured local secret store. **This package does not change the token, its name, or the cloud secret placeholder.**
4. Access to EDS Git repository for block deployment, and to the approved Adobe Edge Functions/CDN deployment environment.
5. From AEM team: corporate PDM brand-code mapping, `NACatalogConstants.DYNAMIC_SUB_CONFIG_TYPES`, custom locale mapping, and verified region mapping. These values were not supplied; do not guess them.

## 3. Install and merge (Mac zsh)

```bash
cd ~/Documents/mysite-edge-functions  # adjust to your actual folder
git status
git switch -c feature/pdm-edge-migration
# Extract downloaded ZIP in Downloads (or Finder), then copy its files:
cp -R ~/Downloads/mysite-edge-functions/src/. ./src/
cp -R ~/Downloads/mysite-edge-functions/config/. ./config/
cp -R ~/Downloads/mysite-edge-functions/eds-block/. ./eds-block/
cp -R ~/Downloads/mysite-edge-functions/test/. ./test/
cp ~/Downloads/mysite-edge-functions/README.md ./README.md
cp ~/Downloads/mysite-edge-functions/MIGRATION_SETUP.md ./MIGRATION_SETUP.md
cp ~/Downloads/mysite-edge-functions/fastly.config.example.toml ./fastly.config.example.toml
npm ci
npm test
```

The `cp` paths assume the extracted folder is `~/Downloads/mysite-edge-functions`; change them if Finder extracted elsewhere. Back up or commit local edits before overwriting. **Do not copy or replace `fastly.toml`**. The archive does not include it.

## 4. Configure local environment (no token changes)

Open your **existing** `fastly.toml`. Preserve all Fastly application metadata, manifest settings, local secret-store settings, and `PDM_API_TOKEN` value. Merge only the missing **non-secret** entries from `fastly.config.example.toml` into the corresponding existing TOML sections. Do not duplicate `[local_server...]` section headers.

Required values:

| Key | Example / requirement |
|---|---|
| backend `pdm_api` | `https://driv-search-api-os-cache.pdm-automotive.com` |
| `PDM_BASE_URL` | `https://driv-search-api-os-cache.pdm-automotive.com/v1` |
| `PDM_REGION_ID` | `1,2` is a prior project assumption; verify with AEM/DRiV |
| `PDM_BRAND_CODES_CORPORATE` | Optional override for the AEM `NACatalogResourceProvider` mapping; when unset, the Edge Function mirrors AEM's uppercase-brand fallback |
| `PDM_CUSTOM_FIELDS` | Optional AEM `getCustomFields()` JSON for Years requests; configure only when `enablePDMCustomFields` is true |
| `PDM_LOCALE` | Optional verified override from `getCustomLocaleValue()`; otherwise block passes `en_US` |
| `PDM_DYNAMIC_SUB_CONFIG_TYPES` | **Must be actual** `NACatalogConstants.DYNAMIC_SUB_CONFIG_TYPES` for full parts |
| `PDM_API_TOKEN` | **Unchanged.** Existing secret store lookup only; never put token in README, URL or block. |

Local secret handling is separate from an ordinary shell variable. Exporting `PDM_API_TOKEN` in Terminal does not automatically populate Fastly's local Secret Store. Use your existing working local store configuration.

## 5. Local run and API tests

Terminal 1:

```bash
cd ~/Documents/mysite-edge-functions
npm test
aio aem edge-functions serve
```

Terminal 2:

```bash
curl -i 'http://127.0.0.1:7676/api/catalog/health'
curl -i -G 'http://127.0.0.1:7676/api/catalog/years' \
  --data-urlencode 'brand=corporate' \
  --data-urlencode 'country_code=US' \
  --data-urlencode 'locale=en_US' \
  --data-urlencode 'vehicle_group_ids=2,8'
```

After Years returns a **real** year ID, test Makes:

```bash
curl -i -G 'http://127.0.0.1:7676/api/catalog/makes' \
  --data-urlencode 'brand=corporate' --data-urlencode 'country_code=US' \
  --data-urlencode 'vehicle_group_ids=2,8' --data-urlencode 'year_id=2027'
```

Replace `2027` with an actual year ID returned by the first call. Then Models with `make_id`, then Parts with `model_id`, `page=1`, `limit=50`. Avoid adding `page` or `limit` to `/years` — PDM rejected them in previous direct testing.

**Expected response behavior:** `200` + `{"years":[]}` means an empty valid response, **not proof of a correct brand mapping**. `400` means invalid/unsupported client parameter; `503 CONFIGURATION_UNAVAILABLE` means missing config; `502` means upstream/auth/JSON/network failure; `504` means timeout. `GET /api/catalog/health` is **liveness only**, not a live PDM check.

## 6. Endpoint mapping and Java behavior

| Edge route | PDM path | Key required query fields | Legacy source |
|---|---|---|---|
| `years` | `/vehicles/years` | `brand_codes`, `vehicle_group_ids`, `region_id`; optional locale, custom fields, part/qualifier IDs | `getYears` |
| `makes` | `/vehicles/makes` | Years fields + `year_id` | `getMakes` |
| `models` | `/vehicles/models` | Makes fields + `make_id` | `getModels` |
| GPI `years/makes/models` | `/vcdb/{route}` | `region_id`, plus year/make where applicable | GPI branch |
| `parts` | `/products/listings/full` | YMM IDs, `page`, `limit`, segments, dynamic sub config, brand codes, sorting | DRiV full listing overload |
| `parts-light` | `/products/listings` | YMM IDs, `digital_assets` and optional hotspot parameters | Lightweight / diagrams overloads |
| `search` | `/products/search` | `brand_codes`, `part_number`, locale | Exact/fuzzy search |
| `engine-mfrs` | `/vehicles/engine_mfrs` | brand/group/region | Engine base class |
| `engine-bases` | `/vehicles/engine_bases` | manufacturer ID | Engine base class |
| `engine-usages` | `/vehicles/engine_usages` | manufacturer/base IDs | Engine base class |
| `engine-versions-ld` | `/vehicles/engine_versions/light_duty` | manufacturer/base/vehicle type IDs | Engine base class |
| `engine-parts-ld` | `/products/engine_listings/light_duty` | manufacturer/base/type/version, pagination | Engine base class |

**Engine warning:** Legacy Java passes `engineBaseId` and `engineVersionId` as preformatted query fragments (`&{}` placeholders), not always simple scalar IDs. This package uses validated explicit fields (`engine_base_ids`, `engine_version_id`) as a **candidate mapping**. Verify the exact PDM parameter names against legacy callers or API documentation before treating engine routes as production-complete.

**Parts variants warning:** The Java source has *different* brand-site, Rancho/B2C and DRiV full-listing overloads. This project primarily targets DRiV corporate full-listing; it does not promise 1:1 Rancho/Walker behavior. Interactive diagram results from PDM may require AEM DAM image enrichment, which is not implemented here.

## 7. Request processing and logs

1. EDS block calls `/api/catalog/{route}` with website-style parameters. The API token is **never** sent to the browser.
2. CDN selects Edge Function origin using `config/cdn.yaml`.
3. `src/index.js` loads non-secret config and token from Fastly stores.
4. `src/catalog.js` validates and builds PDM `/v1` URL, including brand-code mapping.
5. `src/handler.js` creates request ID, logs start, fetches upstream via `pdm_api` backend with `API-Token`, checks HTTP status and JSON, sorts vehicle lists and returns JSON.
6. Client sees `X-Request-ID` and consistent error codes; backend logs use the same request ID.

Example **illustrative** logs (not live server output):

```json
{"level":"info","event":"catalog.request.started","requestId":"example-id","route":"years","method":"GET"}
{"level":"info","event":"pdm.request.started","requestId":"example-id","route":"years","upstreamPath":"/v1/vehicles/years"}
{"level":"info","event":"pdm.response.received","requestId":"example-id","route":"years","upstreamStatus":200,"durationMs":132}
{"level":"info","event":"catalog.result.count","requestId":"example-id","route":"years","resultCount":0}
{"level":"warn","event":"catalog.result.empty","requestId":"example-id","route":"years","resultCount":0}
```

Errors use `{ "error": { "code": "PDM_UPSTREAM_ERROR", "message": "Catalog upstream error", "requestId": "..." } }`. Never log API tokens, Authorization headers, cookies or raw upstream bodies. Logs record significant stages, **not every source-code line**; line-by-line logging is unsafe and noisy. For deployed logs, use the log viewing method approved for your Edge Functions environment; local logs print to the `serve` Terminal.

## 8. EDS block integration and testing both environments

In your EDS site repository (separate from Edge Functions):

```bash
cd ~/Documents/mysite  # adjust path
mkdir -p blocks/parts-finder
cp ~/Documents/mysite-edge-functions/eds-block/parts-finder.js blocks/parts-finder/
cp ~/Documents/mysite-edge-functions/eds-block/parts-finder.css blocks/parts-finder/
```

Create a test page in your EDS authoring source with a `Parts Finder` block (the exact authoring syntax depends on whether you use DA, Google Drive, or another content source). Preview with your EDS development server / preview site. The block has:

- **Deployed / same-origin:** uses `window.location.origin` + `/api/catalog/...`; this requires cloud deployment and CDN route to be active on the same site.
- **Local Edge Function:** uses `http://127.0.0.1:7676/api/catalog/...`; browser cross-origin restrictions apply if EDS runs on another origin. Prefer a same-origin development proxy rather than broad `Access-Control-Allow-Origin: *` on authenticated API routes.
- **Custom origin:** developer diagnostic input. Use only trusted test endpoints; don't expose this test block as a public production feature.
- **Cascading dropdowns:** select group → Years → Makes → Models → Parts; IDs come from actual responses.
- **Direct API test:** choose route and provide extra query params such as `part_number=ABC123` for Search.
- **Diagnostics:** URL, status, duration, request ID and JSON body.

The diagnostic block uses `fetch` and does not contain credentials. Browser `Network` tab can confirm the origin, response and CORS behavior. For local EDS with an HTTP site, a local same-origin reverse proxy can route `/api/catalog/*` to port 7676; if using an HTTPS EDS site, mixed-content restrictions can block direct HTTP localhost calls.

## 9. Cloud configuration and deployment

1. Confirm your Adobe Edge Functions service/function is named `my-edge-function`; otherwise update both `config/edgeFunctions.yaml` and the CDN origin selector to the actual deployed name.
2. `config/edgeFunctions.yaml` defines `pdm_api` origin and `PDM_BASE_URL` pointing to the NA Catalog host. Add verified brand mapping and dynamic types to the cloud config, not placeholders.
3. Preserve `PDM_API_TOKEN` secret key and `${{DRIV_PDM_API_TOKEN}}` reference unchanged. Cloud deployment must have its secret injected by the existing authorized mechanism.
4. Ensure CDN rule for `/api/catalog/*` selects `edgefunction-my-edge-function`. The provided file preserves starter `/weather` and `/hello-world` rules; remove them only if your project doesn't need them.
5. Use your organization's existing Adobe deployment pipeline; exact deployment command/permissions depend on the environment. **No deployment has been performed for this deliverable.**
6. Test deployed `https://<branch>--<repo>--<owner>.aem.live/api/catalog/health`, then Years → Makes → Models → Parts. If response is HTML/404, inspect CDN routing and function deployment rather than assuming PDM is down.
7. Confirm security, logs, performance, timeout, rate limits and production cache policy. Current handler intentionally uses `Cache-Control: no-store` for catalog API responses until caching rules are approved.

## 10. Known gaps / migration acceptance criteria

**Confirmed from Java:** AEM resolves brand codes (`NACatalogResourceProvider`), country mapping (`NACatalogUtil`), custom locale and custom fields, special Walker Content Fragment filters, corporate converter removal, pagination adjustments, part list enrichment and DAM assets. The supplied Java implementation alone does not provide the values or all dependent class implementations. Those features are **not fully migrated** by this package.

Before declaring parity, obtain: `NACatalogResourceProviderImpl`, `NACatalogPDMBaseServiceImpl`, `NACatalogConstants`, `NACatalogUtil`, AEM servlet classes, parts-list DTO transformation code and sample live responses. Validate with real vehicle IDs and a real product search, including GPI/Walker/diagram/engine workflows if those are in scope. Ensure empty results are not misinterpreted as a successful migration.

## 11. Automated test results

Run `npm test`. This package was verified with **24 passing Node tests** for URL construction, country mapping, GPI, parameter validation, Parts, mock upstream errors, timeout, ordering, request IDs and empty arrays. These are **unit tests with mocked upstream**, not live PDM, browser, Fastly runtime or Adobe cloud integration tests.
