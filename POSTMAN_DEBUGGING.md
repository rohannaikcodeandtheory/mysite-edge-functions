# PDM Postman alignment and test guide

## Verified from the uploaded Postman collection (not live API verification)

The Postman collection has 49 requests. The primary vehicle dropdown requests are:

- `GET /v1/vehicles/years?brand_codes=BDCM`
- `GET /v1/vehicles/makes?year_id=2015&brand_codes=BDCM`
- `GET /v1/vehicles/models?brand_codes=BDCM&year_id=2015&make_id=16`

**Root-cause candidate for HTTP 400:** Previous Edge Function added `region_id`, `vehicle_group_ids`, and `locale` to vehicle dropdown requests, although these are absent from the three Postman examples. A 400 can also arise from a wrong token, host, region, or brand mapping. We cannot prove the exact cause without the upstream error response.

`postman_mode=1` now omits those additional parameters for years/makes/models only, preserving legacy mode without that flag. The frontend enables Postman mode by default. For other endpoints, use the Postman inventory as a reference; routes in this starter do not yet cover all 49 collection entries.

## Local tests

Run `npm test` (mocked requests only), then `aio aem edge-functions serve`.

```bash
curl -i 'http://127.0.0.1:7676/api/catalog/health'
curl -i 'http://127.0.0.1:7676/api/catalog/years?brand=corporate&brand_codes=BDCM&postman_mode=1'
curl -i 'http://127.0.0.1:7676/api/catalog/makes?brand=corporate&brand_codes=BDCM&year_id=2015&postman_mode=1'
curl -i 'http://127.0.0.1:7676/api/catalog/models?brand=corporate&brand_codes=BDCM&year_id=2015&make_id=16&postman_mode=1'
```

Inspect HTTP status and JSON body. 200 with JSON indicates success; 502 with `PDM_BAD_REQUEST` means upstream still rejects request. The PDM token must be a valid secret configured locally and never committed to Git. The local Fastly backend must target the hostname matching PDM_BASE_URL.

## Caution

- The Postman collection uses different hosts and `/v1`, `/driv1`, and `/v2` API families. This starter does not automatically support every host or endpoint.
- `BDCM` is a sample brand code, not verified for corporate or MOOG.
- European website mappings remain unverified.
- Browser access to `127.0.0.1` works only on the developer machine, and remote EDS preview may be blocked by CORS or browser private-network restrictions. Same-origin deployment is preferred.
- No real PDM API call has been performed by this package build.
