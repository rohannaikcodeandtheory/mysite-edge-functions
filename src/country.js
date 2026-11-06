// Matches the legacy AEM CountryCode.java enum.
const REGIONS = Object.freeze({ US: '1,2', MX: '1,3', CA: '1,4' });
export function getRegionId(countryCode = 'US') {
  return REGIONS[String(countryCode || 'US').toUpperCase()] || REGIONS.US;
}
