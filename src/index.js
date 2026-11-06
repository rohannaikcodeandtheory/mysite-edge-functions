
import { ConfigStore } from 'fastly:config-store';
import { CacheOverride } from 'fastly:cache-override';

import { handleCatalog } from './handler.js';
import { SecretStoreManager } from './lib/config.js';

addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    const request = event.request;
    const url = new URL(request.url);

    if (url.pathname === '/api/catalog/health') {
      return Response.json({
        status: 'ok',
        service: 'driv-parts-finder',
      });
    }

    try {
      const config = new ConfigStore('config_default');


      const baseUrl = config.get('PDM_BASE_URL');
      const regionId = config.get('PDM_REGION_ID');
      const dynamicTypes = config.get('PDM_DYNAMIC_SUB_CONFIG_TYPES');
      const token = await SecretStoreManager.getSecret('PDM_API_TOKEN').catch(() => null);

      console.log('PDM configuration status:', {
        hasBaseUrl: Boolean(baseUrl),
        hasRegionId: Boolean(regionId),
        hasDynamicTypes: Boolean(dynamicTypes),
        hasToken: Boolean(token),
        backendName: 'pdm_api',
      });

      return await handleCatalog(request, {
        baseUrl,
        regionId,
        dynamicTypes,
        token,

        fetchUpstream: (upstreamUrl, options) => fetch(
          upstreamUrl,
          {
            ...options,
            backend: 'pdm_api',
            cacheOverride: new CacheOverride('pass'),
          },
        ),
      });
    } catch (error) {
      console.error('Edge Functions setup failure:', error.message);

      return Response.json(
        { error: 'Catalog configuration unavailable' },
        {
          status: 502,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }
  })());
});
