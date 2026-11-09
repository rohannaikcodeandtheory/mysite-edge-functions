# Local manual test URLs

These are local Edge Function URLs, not proof of live PDM availability. Replace placeholder IDs with real upstream IDs. For testing before AEM mapping is available, append `&brand_codes=YOUR_VERIFIED_PDM_CODES` (do not assume example Postman codes are corporate).

1. **health**: `http://127.0.0.1:7676/api/catalog/health`
2. **years**: `http://127.0.0.1:7676/api/catalog/years?brand=corporate&country_code=US&locale=en_US&vehicle_group_ids=2%2C8`
3. **makes**: `http://127.0.0.1:7676/api/catalog/makes?brand=corporate&country_code=US&locale=en_US&vehicle_group_ids=2%2C8&year_id=2027`
4. **models**: `http://127.0.0.1:7676/api/catalog/models?brand=corporate&country_code=US&locale=en_US&vehicle_group_ids=2%2C8&year_id=2027&make_id=69`
5. **parts**: `http://127.0.0.1:7676/api/catalog/parts?brand=corporate&country_code=US&locale=en_US&vehicle_group_ids=2%2C8&year_id=2027&make_id=69&model_id=REPLACE_MODEL_ID`
6. **parts-light**: `http://127.0.0.1:7676/api/catalog/parts-light?brand=corporate&country_code=US&locale=en_US&vehicle_group_ids=2%2C8&year_id=2027&make_id=69&model_id=REPLACE_MODEL_ID`
7. **search**: `http://127.0.0.1:7676/api/catalog/search?brand=corporate&part_number=REPLACE_PART_NUMBER`
8. **engine-mfrs**: `http://127.0.0.1:7676/api/catalog/engine-mfrs?brand=corporate&country_code=US&vehicle_group_ids=2%2C8`
9. **engine-bases**: `http://127.0.0.1:7676/api/catalog/engine-bases?brand=corporate&country_code=US&vehicle_group_ids=2%2C8&engine_mfr_id=REPLACE_ENGINE_MFR_ID`
10. **engine-usages**: `http://127.0.0.1:7676/api/catalog/engine-usages?brand=corporate&country_code=US&vehicle_group_ids=2%2C8&engine_mfr_id=REPLACE_ENGINE_MFR_ID&engine_base_id=REPLACE_ENGINE_BASE_ID`
11. **engine-versions-ld**: `http://127.0.0.1:7676/api/catalog/engine-versions-ld?brand=corporate&country_code=US&vehicle_group_ids=2%2C8&engine_mfr_id=REPLACE_ENGINE_MFR_ID&engine_base_id=REPLACE_ENGINE_BASE_ID&engine_usage_ids=REPLACE_USAGE_IDS`
12. **engine-parts-ld**: `http://127.0.0.1:7676/api/catalog/engine-parts-ld?brand=corporate&country_code=US&vehicle_group_ids=2%2C8&engine_mfr_id=REPLACE_ENGINE_MFR_ID&engine_base_id=REPLACE_ENGINE_BASE_ID&engine_usage_ids=REPLACE_USAGE_IDS&engine_version_id=REPLACE_ENGINE_VERSION_ID`
