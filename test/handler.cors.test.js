import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCatalog } from './handler.js';
const allowed = 'http://localhost:3000';
test('health GET allows approved local origin', async () => {
  const r = await handleCatalog(new Request('http://localhost/api/catalog/health', { headers: { Origin: allowed } }));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), allowed);
  assert.equal((await r.json()).status, 'ok');
});
test('preflight from approved origin succeeds', async () => {
  const r = await handleCatalog(new Request('http://localhost/api/catalog/years', { method: 'OPTIONS', headers: { Origin: allowed } }));
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), allowed);
});
test('unapproved preflight is rejected', async () => {
  const r = await handleCatalog(new Request('http://localhost/api/catalog/years', { method: 'OPTIONS', headers: { Origin: 'https://example.org' } }));
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('access-control-allow-origin'), null);
});
test('validation errors include CORS headers', async () => {
  const r = await handleCatalog(new Request('http://localhost/api/catalog/unknown', { headers: { Origin: allowed } }));
  assert.equal(r.status, 404);
  assert.equal(r.headers.get('access-control-allow-origin'), allowed);
});
