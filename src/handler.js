
import { buildCatalogRequest } from './catalog.js';

export async function handleCatalog(
  request,
  {
    baseUrl,
    regionId,
    dynamicTypes,
    token,
    fetchUpstream,
  },
) {
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET' },
    });
  }

  if (url.pathname === '/api/catalog/health') {
    return Response.json({ status: 'ok' });
  }

  const match = /^\/api\/catalog\/(years|makes|models|parts)$/
    .exec(url.pathname);

  if (!match) {
    return new Response('Not Found', { status: 404 });
  }

  if (!baseUrl || !token) {
    console.error('Required PDM configuration is missing');

    return Response.json(
      { error: 'Catalog configuration unavailable' },
      {
        status: 502,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  let upstreamUrl;

  try {
    upstreamUrl = buildCatalogRequest(
      match[1],
      url.searchParams,
      baseUrl,
      regionId,
      dynamicTypes,
    );
  } catch (error) {
    const invalidInput = error instanceof TypeError;

    if (!invalidInput) {
      console.error('PDM configuration error:', error.message);
    }

    return Response.json(
      {
        error: invalidInput
          ? error.message
          : 'Catalog configuration unavailable',
      },
      {
        status: invalidInput ? 400 : 502,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  try {
    const upstream = await fetchUpstream(
      upstreamUrl.toString(),
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'API-Token': token,
        },
      },
    );

    if (!upstream.ok) {
      console.error('PDM upstream HTTP status:', upstream.status);

      return Response.json(
        { error: 'Catalog upstream error' },
        {
          status: 502,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    const contentType = upstream.headers.get('content-type') || '';

    if (!contentType.toLowerCase().includes('json')) {
      console.error('PDM returned a non-JSON response');

      return Response.json(
        { error: 'Unexpected upstream content type' },
        {
          status: 502,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    return new Response(await upstream.text(), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDM request failed:', error.message);

    return Response.json(
      { error: 'Catalog unavailable' },
      {
        status: 502,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}