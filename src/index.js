import { ConfigStore } from 'fastly:config-store';
import { CacheOverride } from 'fastly:cache-override';
import { handleCatalog } from './handler.js';
import { CATALOG_ROUTES } from './catalog.js';
import { SecretStoreManager } from './lib/config.js';
addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    const request = event.request;
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/catalog/')) return new Response('Not Found', { status: 404 });
    const route = url.pathname.slice('/api/catalog/'.length);
    if (route === 'health' || request.method !== 'GET' || !CATALOG_ROUTES.includes(route)) return handleCatalog(request);
    let setupStage = 'config-store';
    try {
      const config = new ConfigStore('config_default');
      const brandCodes = {};
      setupStage = 'brand-code-config';
      for (const brand of ['corporate', 'moog', 'walker', 'gpi']) {
        const code = config.get(`PDM_BRAND_CODES_${brand.toUpperCase()}`);
        if (code) brandCodes[brand] = code;
      }
      setupStage = 'base-url-config';
      const baseUrl = config.get('PDM_BASE_URL');
      setupStage = 'region-config';
      const regionId = config.get('PDM_REGION_ID');
      setupStage = 'dynamic-types-config';
      const dynamicTypes = config.get('PDM_DYNAMIC_SUB_CONFIG_TYPES');
      setupStage = 'locale-config';
      const locale = config.get('PDM_LOCALE');
      setupStage = 'custom-fields-config';
      const customFields = config.get('PDM_CUSTOM_FIELDS');
      setupStage = 'secret-store';
      const token = await SecretStoreManager.getSecret('PDM_API_TOKEN').catch(() => null);
      setupStage = 'request-handler';
      return await handleCatalog(request, {
        baseUrl,
        regionId,
        dynamicTypes,
        locale,
        customFields,
        brandCodes,
        token,
        fetchUpstream: (upstreamUrl, options) => fetch(upstreamUrl, { ...options, backend: 'pdm_api', cacheOverride: new CacheOverride('pass') }),
      });
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error', event: 'catalog.setup.failed', stage: setupStage,
        errorName: error?.name || 'Error',
        ...(error?.name === 'ReferenceError' ? { errorMessage: String(error.message || '').slice(0, 120) } : {}),
      }));
      return Response.json({ error: { code: 'CONFIGURATION_UNAVAILABLE', message: 'Catalog configuration unavailable' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  })());
});
