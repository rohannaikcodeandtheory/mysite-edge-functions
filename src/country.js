const REGIONS = Object.freeze({ US: '1,2', MX: '1,3', CA: '1,4' });
export function getRegionId(countryCode = 'US') {
  const key = String(countryCode || 'US').toUpperCase();
  if (!Object.hasOwn(REGIONS, key)) throw new TypeError(`Unsupported country_code: ${key}`);
  return REGIONS[key];
}
