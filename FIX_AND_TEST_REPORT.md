# DRiV PDM Edge Functions — review and test report

## Changes
- Removed a credential-like value from `fastly.toml` `data` field. Rotate the original token if valid, and remove it from Git history.
- Fail closed with a descriptive internal log when the AEM `brandCodes` mapping is missing; no unverified `CORPORATE` fallback.
- Allow explicit `brand_codes` for controlled manual testing, without changing the stored corporate mapping.
- Accept and ignore legacy `no_cache` timestamp, without forwarding it upstream.
- Added a terminal-only route test script and URL catalog.

## Configuration still required
- `PDM_BRAND_CODES_CORPORATE` must be populated with verified JCR `brandCodes` for corporate/US/en_US.
- Fastly Secret Store `secret_default` must contain `PDM_API_TOKEN`.
- Confirm upstream PDM authorization, custom fields and exact route compatibility with the real API.

## Test scope
- Automated Node tests: see command results below; all upstream fetches are mocked.
- Live upstream PDM tests: NOT EXECUTED; no authorized live secret/network environment available here.
- Local Fastly runtime integration: NOT EXECUTED unless CLI/runtime available; Node tests are not a substitute.
- EDS CDN integration: NOT EXECUTED; deployment not available here.
- The Postman collection contains examples for multiple brands and API versions; it does not identify the corporate mapping.

## Run
`npm test`
`aio aem edge-functions serve`
`bash test-all-urls.sh`

For an explicit verified brand-code override: `BRAND_CODES=YOUR_VERIFIED_CODES bash test-all-urls.sh`.
For dependent routes, set `MODEL_ID`, `PART_NUMBER`, `ENGINE_MFR_ID`, `ENGINE_BASE_ID`, `ENGINE_USAGE_IDS`, `ENGINE_VERSION_ID` using actual API responses.
