import { buildCatalogRequest, CATALOG_ROUTES } from './catalog.js';
const json = (data, status = 200, id = '', extra = {}) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': id, ...extra },
});
const log = (level, event, fields = {}) => {
  const message = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields });
  if (level === 'error') console.error(message);
  else if (level === 'warn') console.warn(message);
  else console.log(message);
};
const failure = (code, message, status, id) => json({ error: { code, message, requestId: id } }, status, id);
const requestId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).slice(2)}`);
export async function handleCatalog(request, options = {}) {
  const id = requestId();
  const started = Date.now();
  const url = new URL(request.url);
  const route = url.pathname.startsWith('/api/catalog/') ? url.pathname.slice('/api/catalog/'.length) : '';
  log('info', 'catalog.request.started', { requestId: id, route, method: request.method });
  if (request.method !== 'GET') return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'GET required', requestId: id } }, 405, id, { Allow: 'GET' });
  if (route === 'health') return json({ status: 'ok', service: 'driv-parts-finder', check: 'liveness', requestId: id }, 200, id);
  if (!CATALOG_ROUTES.includes(route)) return failure('ROUTE_NOT_FOUND', 'Unknown catalog route', 404, id);
  const { baseUrl, regionId, dynamicTypes, token, fetchUpstream, brandCodes, locale, timeoutMs = 12000 } = options;
  if (!baseUrl || !token || typeof fetchUpstream !== 'function') {
    log('error', 'catalog.config.missing', { requestId: id, hasBaseUrl: !!baseUrl, hasToken: !!token });
    return failure('CONFIGURATION_UNAVAILABLE', 'Catalog configuration unavailable', 503, id);
  }
  let upstreamUrl;
  try {
    upstreamUrl = buildCatalogRequest(route, url.searchParams, baseUrl, regionId, dynamicTypes, { brandCodes, locale });
  } catch (error) {
    const invalid = error instanceof TypeError;
    log(invalid ? 'warn' : 'error', 'catalog.request.rejected', { requestId: id, route, code: invalid ? 'INVALID_PARAMETER' : 'CONFIGURATION_UNAVAILABLE', reason: error.message });
    return failure(invalid ? 'INVALID_PARAMETER' : 'CONFIGURATION_UNAVAILABLE', invalid ? error.message : 'Catalog configuration unavailable', invalid ? 400 : 503, id);
  }
  let timer;
  try {
    // No raw query string, credentials, or upstream body are logged.
    log('info', 'pdm.request.started', { requestId: id, route, upstreamPath: upstreamUrl.pathname });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('Catalog request timed out'), { name: 'AbortError' })), timeoutMs);
    });
    const response = await Promise.race([
      fetchUpstream(upstreamUrl.toString(), { method: 'GET', headers: { Accept: 'application/json', 'API-Token': token } }),
      timeout,
    ]);
    log(response.ok ? 'info' : 'error', 'pdm.response.received', { requestId: id, route, upstreamStatus: response.status, durationMs: Date.now() - started });
    if (!response.ok) {
      if (response.status === 400) return json({ error: { code: 'PDM_BAD_REQUEST', message: 'PDM rejected the request. Check brand_codes, parameters, and upstream base URL against Postman.', upstreamStatus: 400, requestId: id } }, 502, id);
      if (response.status === 401 || response.status === 403) return failure('PDM_AUTH_FAILED', 'Catalog upstream authentication failed', 502, id);
      if (response.status === 429) return failure('PDM_RATE_LIMITED', 'Catalog upstream rate limited', 503, id);
      return failure('PDM_UPSTREAM_ERROR', 'Catalog upstream error', 502, id);
    }
    if (!(response.headers.get('content-type') || '').toLowerCase().includes('json')) {
      log('error', 'pdm.response.invalid_content_type', { requestId: id, route });
      return failure('PDM_INVALID_RESPONSE', 'Catalog upstream returned non-JSON data', 502, id);
    }
    let data;
    try { data = await response.json(); } catch {
      log('error', 'pdm.response.invalid_json', { requestId: id, route });
      return failure('PDM_INVALID_RESPONSE', 'Catalog upstream returned invalid JSON', 502, id);
    }
    const records = data?.[route] ?? (route === 'parts' ? data?.application_list : null);
    // Preserve the AEM vehicle-selection ordering without changing other response schemas.
    if (Array.isArray(records) && ['years','makes','models'].includes(route)) {
      if (route === 'years') records.sort((a,b) => Number(b?.id ?? b) - Number(a?.id ?? a));
      else records.sort((a,b) => String(a?.value ?? a?.name ?? '').localeCompare(String(b?.value ?? b?.name ?? '')));
    }
    if (Array.isArray(records)) log('info', 'catalog.result.count', { requestId: id, route, resultCount: records.length });
    if (Array.isArray(records) && records.length === 0) log('warn', 'catalog.result.empty', { requestId: id, route, resultCount: 0 });
    log('info', 'catalog.request.completed', { requestId: id, route, durationMs: Date.now() - started });
    return json(data, 200, id);
  } catch (error) {
    const timeout = error?.name === 'AbortError';
    log('error', 'pdm.request.failed', { requestId: id, route, code: timeout ? 'PDM_TIMEOUT' : 'PDM_NETWORK_ERROR', durationMs: Date.now() - started, errorName: error?.name || 'Error' });
    return failure(timeout ? 'PDM_TIMEOUT' : 'PDM_NETWORK_ERROR', timeout ? 'Catalog upstream timed out' : 'Catalog upstream unavailable', timeout ? 504 : 502, id);
  } finally { if (timer) clearTimeout(timer); }
}
