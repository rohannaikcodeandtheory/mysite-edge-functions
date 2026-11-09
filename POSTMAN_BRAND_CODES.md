# Postman brand codes and scope

Extracted from the supplied `Search-API (DRiV)` Postman collection. These values are examples for different API requests, **not** the AEM corporate Global Content `brandCodes` property.

Observed codes: `BDCM`, `BDCN,BCKM`, `BCWV,BDBR,BHVW`, `BBKH`, `BDXN`, `BDCN`, `BCSJ`, and a longer composite set.

The local `fastly.toml` sets `PDM_BRAND_CODES_CORPORATE = "BDCM"` **for a temporary smoke test only**, to unblock `CONFIGURATION_UNAVAILABLE`. Do not deploy this as a verified corporate mapping. A 200 response with BDCM does not establish correct corporate catalog coverage. Replace with the real AEM `brandCodes` before production.

## Run

1. Edit `fastly.toml` and replace `REPLACE_WITH_YOUR_LOCAL_PDM_TOKEN` with a valid token in a private local copy. Never commit it.
2. `npm ci && npm test`
3. `aio aem edge-functions serve`
4. In another terminal: `bash test-all-urls.sh`

## Manual URLs

- http://127.0.0.1:7676/api/catalog/health
- http://127.0.0.1:7676/api/catalog/years?brand=corporate&country_code=US&locale=en_US&vehicle_group_ids=2%2C8
- http://127.0.0.1:7676/api/catalog/makes?brand=corporate&country_code=US&locale=en_US&vehicle_group_ids=2%2C8&year_id=2027
- http://127.0.0.1:7676/api/catalog/models?brand=corporate&country_code=US&locale=en_US&vehicle_group_ids=2%2C8&year_id=2027&make_id=69

For the remaining URLs see `TEST_URLS.md`.

## Security

The original project contained a local placeholder secret. This package contains no actual PDM token. If a live token was previously exposed or committed, rotate it. The `brand_codes` query override is intended for controlled debugging; restrict or remove it before exposing public production endpoints.
