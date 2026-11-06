import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogRequest } from '../src/catalog.js';
import { getRegionId } from '../src/country.js';
import { handleCatalog } from '../src/handler.js';
const base = 'https://pdm.example.test/api/v1';
test('country region IDs match legacy CountryCode.java', () => {
  assert.equal(getRegionId('US'), '1,2');
  assert.equal(getRegionId('MX'), '1,3');
  assert.equal(getRegionId('CA'), '1,4');
  assert.equal(getRegionId('ZZ'), '1,2');
});
test('years request uses region mapping and preserves API base path', () => {
  const u = buildCatalogRequest('years', 'vehicle_group_ids=2%2C8&country_code=US', base, '1,2', '');
  assert.equal(u.pathname, '/api/v1/vehicles/years');
  assert.equal(u.searchParams.get('region_id'), '1,2');
  assert.equal(u.searchParams.get('vehicle_group_ids'), '2,8');
});
test('Mexico request resolves MX region', () => {
  const u = buildCatalogRequest('years', 'vehicle_group_ids=7&country_code=MX', base, '1,2', '');
  assert.equal(u.searchParams.get('region_id'), '1,3');
});
test('parts maps all essential IDs', () => {
  const u = buildCatalogRequest('parts', 'vehicle_group_ids=7&year_id=2024&make_id=59&model_id=27772', base, '1,2', 'engine_base');
  assert.equal(u.pathname, '/api/v1/products/listings/full');
  assert.equal(u.searchParams.get('model_id'), '27772');
});
test('rejects invalid group IDs', () => assert.throws(() => buildCatalogRequest('years', 'vehicle_group_ids=abc', base, '1,2', '')));
test('mock upstream response', async () => {
  const req = new Request('https://site.test/api/catalog/years?vehicle_group_ids=7');
  const response = await handleCatalog(req, { baseUrl: base, regionId: '1,2', dynamicTypes: 'x', token: 'test-token', fetchUpstream: async () => new Response(JSON.stringify({ years: [2024] }), { headers: { 'content-type': 'application/json' } }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { years: [2024] });
});
test('upstream 401 becomes safe 502 response', async () => {
  const req = new Request('https://site.test/api/catalog/years?vehicle_group_ids=7');
  const response = await handleCatalog(req, { baseUrl: base, regionId: '1,2', dynamicTypes: '', token: 'test-token', fetchUpstream: async () => new Response('Unauthorized', { status: 401 }) });
  assert.equal(response.status, 502);
});
