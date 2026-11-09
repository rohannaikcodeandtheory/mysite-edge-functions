# DRiV PDM migration: installation and testing

## What is included

- Edge Functions routing for Years, Makes, Models, Parts, lightweight Parts, Search, and light-duty engine endpoints.
- Structured lifecycle logs, X-Request-ID, validation, error codes, timeouts and safe JSON parsing.
- EDS block with local/deployed environment selection and JSON diagnostics.
- Corrected `config/edgeFunctions.yaml` origin and `config/cdn.yaml` routing.
- Automated tests in `test/catalog.test.js`.

## Credential handling — unchanged

This deliverable intentionally does **not** include or replace `fastly.toml` or your PDM token. Keep your existing `fastly.toml` and its `PDM_API_TOKEN` secret store configuration. Do not commit the real token. `config/edgeFunctions.yaml` retains the original secret key and deployment placeholder `${{DRIV_PDM_API_TOKEN}}`.

## Step-by-step installation

1. Back up your existing `mysite-edge-functions` repository and create a Git branch.
2. Copy `src/`, `config/cdn.yaml`, `config/edgeFunctions.yaml`, `eds-block/`, and `test/catalog.test.js` from this package into your repo.
3. Keep your existing `fastly.toml` **as-is for its token**. Merge the *non-secret* config entries from `fastly.config.example.toml` into its existing sections. Do not create duplicate TOML section headers.
4. In both local and cloud config, fill `PDM_BRAND_CODES_CORPORATE` with the actual mapping obtained from AEM `NACatalogResourceProvider`. Without it, corporate requests intentionally return 503 instead of silently returning empty arrays.
5. Set `PDM_DYNAMIC_SUB_CONFIG_TYPES` to the actual value from `NACatalogConstants.DYNAMIC_SUB_CONFIG_TYPES` before testing full Parts.
6. Optionally set `PDM_LOCALE` to the verified AEM `getCustomLocaleValue` mapping.
7. Run `npm test` (or `node --test test/catalog.test.js`).
8. Run `aio aem edge-functions serve` and test `curl -i http://127.0.0.1:7676/api/catalog/health`.
9. Test `curl -i -G http://127.0.0.1:7676/api/catalog/years --data-urlencode 'brand=corporate' --data-urlencode 'country_code=US' --data-urlencode 'locale=en_US' --data-urlencode 'vehicle_group_ids=2,8'`.
10. Copy `eds-block/parts-finder.js` and `eds-block/parts-finder.css` into `mysite/blocks/parts-finder/` and add the block to a test page. Select Deployed or Local in the diagnostic UI. Local cross-origin requests may require a development proxy/CORS policy.
11. Deploy Edge Functions and the CDN config through your approved Cloud Manager workflow; confirm deployment names and YAML schema with your environment.
12. Test `/api/catalog/health`, then Years -> Makes -> Models -> Parts on the deployed EDS origin.

## Important limitations

- The Java implementation relies on AEM `NACatalogResourceProvider`, `NACatalogConstants`, and AEM DAM enrichment. These values and transformations are not present in the supplied files and are **not** fabricated here.
- The additional engine routes are first-pass mappings based on supplied Java source, not verified against live PDM. Engine usage and version filter semantics need integration testing.
- The legacy parts listing performs corporate converter filtering, pagination adjustments, and digital asset enrichment. Those transformations are **not yet replicated**.
- The health route is liveness only; it does not test PDM connectivity.
- The block is a developer diagnostic interface, not a production storefront replacement.
- `fastly.config.example.toml` is a merge reference, not a standalone complete Fastly configuration.
