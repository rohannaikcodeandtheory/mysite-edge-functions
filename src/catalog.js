import { getRegionId } from './country.js';

const number = (params, key, fallback) => {
  const value = params.get(key) ?? fallback;

  if (!value || !/^\d{1,12}$/.test(String(value))) {
    throw new TypeError(`Invalid ${key}`);
  }

  return String(value);
};

const vehicleGroups = (params) => {
  const value = params.get('vehicle_group_ids');

  if (!value || !/^\d{1,12}(,\d{1,12})*$/.test(value)) {
    throw new TypeError('Invalid vehicle_group_ids');
  }

  return value;
};

export function buildCatalogRequest(
  route,
  input,
  baseUrl,
  regionId,
  dynamicTypes,
) {
  const params = new URLSearchParams(input);

  const supportedRoutes = [
    'years',
    'makes',
    'models',
    'parts',
  ];

  if (!supportedRoutes.includes(route)) {
    throw new TypeError('Unknown catalog route');
  }

const effectiveRegionId = getRegionId(params.get('country_code') || 'US');

  const brand = params.get('brand') || 'corporate';

  if (!['corporate', 'gpi'].includes(brand)) {
    throw new TypeError('Unsupported brand');
  }

  const isGpi = brand === 'gpi' && route !== 'parts';

  const path = route === 'parts'
    ? 'products/listings/full'
    : `${isGpi ? 'vcdb' : 'vehicles'}/${route}`;

  // Preserve the /api/v1 base path.
  const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, '')}/`;

  const upstreamUrl = new URL(path, normalizedBaseUrl);

  const query = upstreamUrl.searchParams;

  query.set('region_id', effectiveRegionId);

  if (!isGpi) {
    query.set('vehicle_group_ids', vehicleGroups(params));
    query.set('brand_codes', params.get('brand_codes') || 'corporate');
    query.set('locale', params.get('locale') || 'en_US');
  }

  if (['makes', 'models', 'parts'].includes(route)) {
    query.set('year_id', number(params, 'year_id'));
  }

  if (['models', 'parts'].includes(route)) {
    query.set('make_id', number(params, 'make_id'));
  }

  if (route === 'parts') {
    query.set('model_id', number(params, 'model_id'));

    const page = Number(number(params, 'page', '1'));
    const limit = Number(number(params, 'limit', '50'));

    if (page > 1000 || limit < 1 || limit > 50) {
      throw new TypeError('Invalid pagination');
    }

    query.set('page', String(page));
    query.set('limit', String(limit));

    query.set('brands', 'true');

    query.set(
      'segments',
      'part_attributes,descriptions,extended_informations',
    );

    if (!dynamicTypes) {
      throw new Error(
        'PDM_DYNAMIC_SUB_CONFIG_TYPES is missing',
      );
    }

    query.set('dynamic_sub_config_types', dynamicTypes);
    query.set('sort_by', 'part_type_sequence');
    query.set('sort_order', 'asc');
  }

  return upstreamUrl;
}