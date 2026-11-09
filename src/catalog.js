import { getRegionId } from './country.js';

const ROUTES = Object.freeze({
  years: 'vehicles/years', makes: 'vehicles/makes', models: 'vehicles/models',
  parts: 'products/listings/full', 'parts-light': 'products/listings',
  search: 'products/search', 'engine-mfrs': 'vehicles/engine_mfrs',
  'engine-bases': 'vehicles/engine_bases', 'engine-usages': 'vehicles/engine_usages',
  'engine-versions-ld': 'vehicles/engine_versions/light_duty',
  'engine-parts-ld': 'products/engine_listings/light_duty',
});
export const CATALOG_ROUTES = Object.keys(ROUTES);
const digits = (v, name, fallback) => {
  const x = v ?? fallback;
  if (!/^\d{1,12}$/.test(String(x ?? ''))) throw new TypeError(`Invalid ${name}`);
  return String(x);
};
const csvIds = (v, name) => {
  if (!/^\d{1,12}(,\d{1,12})*$/.test(String(v ?? ''))) throw new TypeError(`Invalid ${name}`);
  return String(v);
};
const safeCsv = (v, name) => {
  if (!/^[a-zA-Z0-9_,.-]{1,500}$/.test(String(v ?? ''))) throw new TypeError(`Invalid ${name}`);
  return String(v);
};
const optional = (input, output, names, validator = safeCsv) => {
  for (const name of names) if (input.has(name)) output.set(name, validator(input.get(name), name));
};
const ENGINE_FILTER_KEYS = new Set([
  'engine_base_block_type_id', 'engine_base_cubic_centimeter_id', 'engine_base_cubic_inch_id',
  'engine_base_cylinder_id', 'engine_base_liter_id', 'engine_base_bore_inch_id',
  'engine_base_bore_metric_id', 'engine_base_stroke_inch_id', 'engine_base_stroke_metric_id',
  'engine_aspiration_id', 'engine_cylinder_head_type_id', 'engine_designation_id',
  'engine_fuel_delivery_sub_type_id', 'engine_fuel_delivery_type_id', 'engine_fuel_type_id',
  'engine_power_output_id', 'engine_valve_id', 'engine_version_id', 'engine_vin_id',
]);
const ENGINE_BASE_IMPLICIT_FILTER_KEYS = 'engine_base_block_type,engine_base_cylinder,engine_base_liter,engine_base_cubic_inch,engine_base_cubic_centimeter';
const ENGINE_PARTS_IMPLICIT_FILTER_KEYS = `${ENGINE_BASE_IMPLICIT_FILTER_KEYS},engine_cylinder_head_type,engine_fuel_delivery_sub_type,engine_fuel_type,engine_valve,engine_vin,engine_designation,engine_version,engine_aspiration`;
const ENGINE_PARTS_DYNAMIC_TYPES = 'drive,engine_base,sub_model,engine_vin,engine_designation';
const setCustomFields = (output, value) => {
  if (!value) return;
  let fields;
  try { fields = JSON.parse(value); } catch {
    try { fields = JSON.parse(decodeURIComponent(value)); } catch { throw new TypeError('Invalid custom_fields'); }
  }
  if (!Array.isArray(fields) || fields.some(field => !field || typeof field.type !== 'string' || typeof field.value !== 'string')) {
    throw new TypeError('Invalid custom_fields');
  }
  output.set('custom_fields', JSON.stringify(fields));
};
const appendEngineFilter = (output, value, parameterName) => {
  if (!value) return false;
  let fragment = value;
  for (let attempt = 0; attempt < 2 && /%(?:26|3d)/i.test(fragment); attempt++) {
    try { fragment = decodeURIComponent(fragment); } catch { throw new TypeError(`Invalid ${parameterName}`); }
  }
  if (/^\d{1,12}$/.test(fragment)) {
    output.set(parameterName, fragment);
    return true;
  }
  const entries = [...new URLSearchParams(fragment)];
  if (!entries.length || entries.some(([key, item]) => !ENGINE_FILTER_KEYS.has(key) || !/^\d{1,12}$/.test(item))) {
    throw new TypeError(`Invalid ${parameterName}`);
  }
  for (const [key, item] of entries) output.append(key, item);
  return true;
};
export function buildCatalogRequest(route, input, baseUrl, regionId, dynamicTypes, config = {}) {
  if (!Object.hasOwn(ROUTES, route)) throw new TypeError('Unknown catalog route');
  const p = new URLSearchParams(input);
  const postmanMode = p.get('postman_mode') === '1' && ['years', 'makes', 'models'].includes(route);
  const brand = p.get('brand') || 'corporate';
  if (!/^[a-z0-9_-]{1,50}$/i.test(brand)) throw new TypeError('Invalid brand');
  const isGpi = brand.toLowerCase() === 'gpi' && ['years', 'makes', 'models'].includes(route);
  const path = isGpi ? `vcdb/${route}` : ROUTES[route];
  const base = new URL(`${String(baseUrl || '').replace(/\/+$/, '')}/`);
  if (base.protocol !== 'https:') throw new Error('PDM_BASE_URL must use HTTPS');
  const url = new URL(path, base);
  const q = url.searchParams;
  // Explicit region override is allowed only if it contains numeric region IDs.
  const region = p.has('region_id') ? csvIds(p.get('region_id'), 'region_id') : (regionId && !p.has('country_code') ? csvIds(regionId, 'PDM_REGION_ID') : getRegionId(p.get('country_code') || 'US'));
  if (!postmanMode) q.set('region_id', region);
  if (!isGpi) {
    const mapping = config.brandCodes || {};
    const codes = p.get('brand_codes') || mapping[brand.toLowerCase()];
    if (!codes) throw new Error(`PDM brand-code mapping not configured for ${brand.toLowerCase()}; set PDM_BRAND_CODES_${brand.toUpperCase()} or supply brand_codes for manual testing`);
    q.set('brand_codes', safeCsv(codes, 'brand_codes'));
    if (['years', 'makes', 'models', 'parts', 'engine-mfrs', 'engine-bases', 'engine-usages', 'engine-versions-ld', 'engine-parts-ld'].includes(route)) {
      if (!postmanMode) q.set('vehicle_group_ids', csvIds(p.get('vehicle_group_ids'), 'vehicle_group_ids'));
    }
    const locale = p.get('pdm_locale') || config.locale || p.get('locale');
    if (locale) {
      if (!/^[a-zA-Z_\-]{2,24}$/.test(locale)) throw new TypeError('Invalid locale');
      if (!postmanMode && ['years', 'makes', 'models', 'parts', 'parts-light', 'search', 'engine-versions-ld'].includes(route)) q.set('locale', locale);
    }
    setCustomFields(q, p.get('custom_fields') || config.customFields);
    optional(p, q, ['part_type_ids', 'qualifier_ids']);
  }
  if (['makes', 'models', 'parts', 'parts-light'].includes(route)) q.set('year_id', digits(p.get('year_id'), 'year_id'));
  if (['models', 'parts', 'parts-light'].includes(route)) q.set('make_id', digits(p.get('make_id'), 'make_id'));
  if (['parts', 'parts-light'].includes(route)) q.set('model_id', digits(p.get('model_id'), 'model_id'));
  if (['parts', 'engine-parts-ld'].includes(route)) {
    q.set('page', digits(p.get('page'), 'page', '1'));
    q.set('limit', digits(p.get('limit'), 'limit', '50'));
    if (Number(q.get('page')) > 10000 || Number(q.get('limit')) > 100) throw new TypeError('Invalid pagination');
    q.set('brands', 'true');
    q.set('segments', 'part_attributes,descriptions,extended_informations');
    const routeDynamicTypes = route === 'engine-parts-ld' ? ENGINE_PARTS_DYNAMIC_TYPES : dynamicTypes;
    if (!routeDynamicTypes) throw new Error('PDM_DYNAMIC_SUB_CONFIG_TYPES is missing');
    q.set('dynamic_sub_config_types', safeCsv(routeDynamicTypes, 'dynamic_sub_config_types'));
  }
  if (route === 'parts-light') {
    q.set('brands', 'true');
    q.set('dynamic_sub_config_types', 'drive,engine_base,sub_model,body_type,body_door,engine_designation,engine_vin,transmission_base_type,transmission_base_control_type,transmission_base_gear,transmission_mfr_code,wheel_base,brake_abs,steering_system');
    optional(p, q, ['digital_assets', 'app__digital_assets__file_name', 'app__digital_assets__asset_item_order', 'app__digital_assets__asset_item_ref'], (v, name) => {
      if (name === 'app__digital_assets__file_name') {
        if (!/^[\w.\-]{1,150}$/.test(v)) throw new TypeError('Invalid file name');
        return v;
      }
      return digits(v, name);
    });
  }
  if (route === 'search') {
    const partNumber = p.get('part_number');
    if (!partNumber || partNumber.length > 120) throw new TypeError('Invalid part_number');
    q.set('part_number', partNumber);
  }
  if (['engine-bases', 'engine-usages', 'engine-versions-ld', 'engine-parts-ld'].includes(route)) q.set('engine_mfr_id', digits(p.get('engine_mfr_id'), 'engine_mfr_id'));
  if (route === 'engine-bases') q.set('return_implicit_results', '1');
  if (['engine-usages', 'engine-versions-ld', 'engine-parts-ld'].includes(route)) {
    const baseFragment = p.get('engine_base_id');
    const baseIds = p.get('engine_base_ids');
    if (baseFragment) appendEngineFilter(q, baseFragment, 'engine_base_id');
    else if (baseIds) q.set('engine_base_ids', csvIds(baseIds, 'engine_base_ids'));
    else throw new TypeError('Missing engine_base_id');
    q.set('return_implicit_results', '1');
    q.set('implicit_filter_keys', route === 'engine-parts-ld' ? ENGINE_PARTS_IMPLICIT_FILTER_KEYS : ENGINE_BASE_IMPLICIT_FILTER_KEYS);
  }
  if (['engine-versions-ld', 'engine-parts-ld'].includes(route)) {
    const usageIds = p.get('engine_usage_ids') || p.get('vehicle_type_ids');
    q.set('vehicle_type_ids', csvIds(usageIds, 'engine_usage_ids'));
  }
  if (route === 'engine-parts-ld' && p.has('engine_version_id')) appendEngineFilter(q, p.get('engine_version_id'), 'engine_version_id');
  if (route.startsWith('engine-')) {
    for (const key of ENGINE_FILTER_KEYS) {
      if (p.has(key) && !(route === 'engine-parts-ld' && key === 'engine_version_id')) q.set(key, digits(p.get(key), key));
    }
  }
  if (['parts', 'parts-light', 'engine-parts-ld'].includes(route)) {
    // Accept a safe allowlist of the additional PDM filters used by the legacy UI.
    for (const [key, value] of p) {
      if (/^(filter_qualifier_ids|qualifiers\[\]|position_ids|sub_brand_codes)$/.test(key) || (key === 'brand_codes' && route === 'parts')) {
        if (key !== 'brand_codes' || !q.has('brand_codes')) q.append(key, safeCsv(value, key));
      }
    }
    q.set('sort_by', 'part_type_sequence'); q.set('sort_order', 'asc');
  }
  // Unknown query parameters are rejected rather than silently changing behavior.
  const common = new Set(['brand','brand_codes','country_code','region_id','locale','pdm_locale','vehicle_group_ids','custom_fields','part_type_ids','qualifier_ids','no_cache','postman_mode']);
  const routeKeys = {
    years: [], makes: ['year_id'], models: ['year_id','make_id'],
    parts: ['year_id','make_id','model_id','page','limit','filter_qualifier_ids','qualifiers[]','position_ids','sub_brand_codes'],
    'parts-light': ['year_id','make_id','model_id','digital_assets','app__digital_assets__file_name','app__digital_assets__asset_item_order','app__digital_assets__asset_item_ref','filter_qualifier_ids','qualifiers[]','position_ids','sub_brand_codes'],
    search: ['part_number'], 'engine-mfrs': [], 'engine-bases': ['engine_mfr_id'],
    'engine-usages': ['engine_mfr_id','engine_base_id','engine_base_ids'],
    'engine-versions-ld': ['engine_mfr_id','engine_base_id','engine_base_ids','engine_usage_ids','vehicle_type_ids'],
    'engine-parts-ld': ['engine_mfr_id','engine_base_id','engine_base_ids','engine_usage_ids','vehicle_type_ids','engine_version_id','page','limit','filter_qualifier_ids','qualifiers[]','position_ids','sub_brand_codes'],
  };
  const allowed = new Set([...common,...routeKeys[route]]);
  if (route.startsWith('engine-')) for (const key of ENGINE_FILTER_KEYS) allowed.add(key);
  for (const key of p.keys()) if (!allowed.has(key)) throw new TypeError(`Unsupported parameter: ${key}`);
  return url;
}
