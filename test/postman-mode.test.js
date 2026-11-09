import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogRequest } from '../src/catalog.js';
const base = 'https://driv-search-api-os-cache.pdm-automotive.com/v1';
for (const [route, input, expected] of [
  ['years','brand=corporate&brand_codes=BDCM&postman_mode=1','/v1/vehicles/years?brand_codes=BDCM'],
  ['makes','brand=corporate&brand_codes=BDCM&year_id=2015&postman_mode=1','/v1/vehicles/makes?brand_codes=BDCM&year_id=2015'],
  ['models','brand=corporate&brand_codes=BDCM&year_id=2015&make_id=16&postman_mode=1','/v1/vehicles/models?brand_codes=BDCM&year_id=2015&make_id=16'],
]) {
  test(`Postman-compatible ${route} does not inject region, locale or vehicle groups`, () => {
    const u=buildCatalogRequest(route,new URLSearchParams(input),base,'1,2','',{});
    assert.equal(u.pathname, expected.split('?')[0]);
    const q=u.searchParams;
    for(const [key,val] of new URLSearchParams(expected.split('?')[1])) assert.equal(q.get(key),val);
    assert.equal(q.has('region_id'),false);
    assert.equal(q.has('vehicle_group_ids'),false);
    assert.equal(q.has('locale'),false);
  });
}
