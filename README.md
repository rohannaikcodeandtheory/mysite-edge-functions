# DRiV Parts Finder → AEM Edge Functions migration starter

This ZIP is a **starter/overlay**, not a ready-to-deploy, verified copy of your GitHub repository. It does not include real PDM credentials, the real PDM host, Adobe Cloud Manager IDs, or a confirmed PDM response schema. **Do not overwrite the Adobe boilerplate blindly.**

## Goal
Replace the AEM Java PDM integration with: **EDS Parts Finder block → Adobe Edge Function → existing PDM API**.

## Source-derived behavior
From the uploaded `NACatalogPDMBaseServiceImpl.java`: GET/POST; `Accept: application/json`; optional `API-Token` request header; PDM base URL from OSGi config. From `NACatalogVehiclePDMApiServiceImpl.java`: `/vehicles/years`, `/vehicles/makes`, `/vehicles/models`, `/products/listings/full`; special `gpi` VCDB lookups; DRiV full parts listing uses pagination, segments, dynamic sub-config types, sorting, and extra filters. This starter implements the **core four endpoints only** and excludes advanced qualifiers, extra filters, other services, B2C, and POST.

## 1 — Existing local repo (do not clone again)

Open Terminal:

```bash
cd /YOUR/ACTUAL/PATH/mysite-edge-functions
git status
git remote -v
git switch -c feature/driv-parts-finder
```

If branch exists use `git switch feature/driv-parts-finder`. Back up your original `src/index.js` before changes. Confirm `node -v`, `npm -v`, `aio --version`, and `aio aem edge-functions --help`.

## 2 — Understand files

| File | Purpose |
| --- | --- |
| `src/catalog.js` | Validates query values and constructs PDM URLs, including `gpi` routing |
| `src/handler.js` | Handles API routes and safely returns upstream JSON |
| `src/index.js` | Adobe/Fastly runtime adapter; reads ConfigStore/SecretStore |
| `test/catalog.test.js` | Offline tests, no token or network needed |
| `eds-block/*` | Starter EDS UI; response mapping deliberately unfinished |
| `config/*.example.yaml` | **Examples** for Cloud Manager config; must be validated |
| `fastly.local.example.toml` | Local backend declaration example |

## 3 — Test logic before touching the boilerplate

Extract ZIP to a separate directory, then:

```bash
cd driv-eds-edge-functions-starter
node --version
npm test
```

Tests should pass with Node 20+. No Adobe login, token or PDM host is required for these mock tests.

## 4 — Merge into your cloned Adobe boilerplate

Copy `src/catalog.js` and `src/handler.js` into your repo's `src/`. **Do not replace the existing `src/index.js` until you inspect the boilerplate's event registration and imports.** Use the provided `src/index.js` as an adapter example and merge its routing into your actual entrypoint. The `fastly:*` imports run under the Edge Functions runtime, not plain Node.

## 5 — Obtain missing configuration

From your client/integration team (never send secrets in chat):

- Real PDM base URL / hostname and network access approval.
- Real `API-Token` and approved Adobe secret provisioning.
- PDM numeric `region_id` for `country_code=US`.
- Value of `NACatalogConstants.DYNAMIC_SUB_CONFIG_TYPES`.
- Sample JSON for years, makes, models and parts.
- Relevant DTOs, servlet/controller mappings, and `HttpUtil.java` if exact compatibility is needed.

**Important:** The website's `country_code=US` is NOT the same as a confirmed PDM numeric `region_id`.

## 6 — Configure local Adobe runtime

Install CLI if necessary:

```bash
npm install -g @adobe/aio-cli
aio plugins install @adobe/aio-cli-plugin-aem-edge-functions
```

Merge `fastly.local.example.toml` into your existing `fastly.toml` and replace the hostname. Configure local `config_default` keys `PDM_BASE_URL`, `PDM_REGION_ID`, `PDM_DYNAMIC_SUB_CONFIG_TYPES` and local `secret_default` entry `PDM_API_TOKEN` **using the mechanism supported by your installed boilerplate**. Do not commit credentials. The example does not create secret stores automatically.

Run from the real Edge Functions repo:

```bash
npm install
aio aem edge-functions serve
```

Verify your configured port (commonly 7676):

```bash
curl -i http://127.0.0.1:7676/api/catalog/health
curl -i 'http://127.0.0.1:7676/api/catalog/years?vehicle_group_ids=7'
curl -i 'http://127.0.0.1:7676/api/catalog/makes?vehicle_group_ids=7&year_id=2024'
curl -i 'http://127.0.0.1:7676/api/catalog/models?vehicle_group_ids=7&year_id=2024&make_id=59'
curl -i 'http://127.0.0.1:7676/api/catalog/parts?vehicle_group_ids=7&year_id=2024&make_id=59&model_id=27772'
```

A 502 can indicate absent local config, upstream restrictions, missing secret, or unsupported runtime backend configuration. Check local logs **without printing tokens**.

## 7 — Integrate EDS block

Copy `eds-block/parts-finder.js` and `.css` into `mysite/blocks/parts-finder/`, renaming them to `parts-finder.js` and `parts-finder.css` as provided. Author a `Parts Finder` block in the EDS content source. Start EDS locally from its own repo with `aem up` (usually port 3000).

**Local CORS warning:** browser requests from `localhost:3000` to `127.0.0.1:7676` require an explicit development-only CORS policy or reverse proxy. Curl tests do not. Production should use same-origin CDN routing. Do not enable wildcard CORS on authenticated or sensitive APIs.

The UI currently **logs/displays the years JSON** rather than filling all dropdowns: the DTO response shape is not known. Make/Model and results rendering must be completed after inspecting real JSON; do not mistake this starter for the finished DRiV UI.

## 8 — Production deployment (Cloud Manager required)

1. Confirm an eligible Adobe Cloud Manager EDS program, custom domain/CDN, access rights, and Edge Functions enablement.
2. Review `config/edgeFunctions.example.yaml` and `config/cdn.example.yaml` against Adobe's current schema and your existing configuration. Merge, don't overwrite.
3. Provision the outbound PDM backend and PDM token through the supported Cloud Manager secrets/config mechanism.
4. Run the appropriate Cloud Manager EDS configuration pipeline.
5. `aio login`, `aio aem edge-functions setup`, `aio aem edge-functions info`.
6. `aio aem edge-functions build`, then `aio aem edge-functions deploy driv-parts-finder` (confirm function name and CLI version).
7. Test `/api/catalog/years` and the other routes on the actual mapped domain.
8. Add API timeouts, rate limits, caching policy, payload limits, monitoring, and integration tests before production.

Official docs: https://experienceleague.adobe.com/en/docs/experience-manager-learn/cloud-service/edge-functions/edge-functions-setup/setup-eds

## 9 — Known gaps and important differences

- No real PDM API host, region ID, token or dynamic-sub-config constant supplied.
- The old Java implementation supports additional filters/qualifiers and brand-specific paths not fully migrated.
- The real DTO JSON response structure has not been verified; frontend dropdown population is intentionally incomplete.
- `HttpUtil.java` was not supplied; exact retries/timeouts/error semantics are not reproduced.
- The Adobe boilerplate may use different entrypoint/secret helpers; verify before copying.
- Cloud Manager/CDN YAML files are examples, **not validated deployment configuration**.
- This project only implements the Vehicle API slice, not all seven uploaded Java services.

## 10 — Suggested next work

First pass `npm test`; then merge files into the existing repo; get the health endpoint working; configure PDM credentials securely; verify years/makes/models/parts JSON; complete dropdown rendering; only then deploy.
