// Copy this file to mysite/blocks/parts-finder/parts-finder.js
// EDS production calls same-origin /api/catalog; local EDS calls port 7676.
const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const base = local ? 'http://127.0.0.1:7676' : window.location.origin;
const makeSelect = (title) => {
  const label = document.createElement('label');
  label.textContent = title;
  const select = document.createElement('select');
  select.setAttribute('aria-label', title);
  label.append(select);
  return { label, select, title };
};
function optionsFor(data, route) {
  // DTO shape has not been verified against the legacy Years servlet.
  const candidate = Array.isArray(data) ? data : data?.[route] ?? data?.data?.[route] ?? data?.results;
  if (!Array.isArray(candidate)) return null;
  const values = candidate.map((item) => {
    if (typeof item === 'number' || typeof item === 'string') return { value: String(item), label: String(item) };
    if (!item || typeof item !== 'object') return null;
    const value = item.id ?? item.value ?? item.year_id ?? item.make_id ?? item.model_id;
    const label = item.name ?? item.label ?? item.year ?? item.value ?? value;
    return value == null ? null : { value: String(value), label: String(label) };
  });
  return values.every(Boolean) ? values : null;
}
export default function decorate(block) {
  block.replaceChildren();
  const group = makeSelect('Vehicle group');
  const year = makeSelect('Year');
  const make = makeSelect('Make');
  const model = makeSelect('Model');
  const output = document.createElement('pre');
  output.setAttribute('aria-live', 'polite');
  const partsButton = document.createElement('button');
  partsButton.textContent = 'Find Parts';
  partsButton.disabled = true;
  group.select.append(new Option('Select vehicle group', ''), new Option('Groups 2,8', '2,8'), new Option('Group 7', '7'));
  block.append(group.label, year.label, make.label, model.label, partsButton, output);
  const fields = [year, make, model];
  const reset = (from = 0) => {
    fields.slice(from).forEach(({ select, title }) => {
      select.replaceChildren(new Option(`Select ${title}`, ''));
      select.disabled = true;
    });
    partsButton.disabled = true;
  };
  reset();
  let serial = 0;
  const shared = () => ({ brand: 'corporate', locale: 'en_US', country_code: 'US', vehicle_group_ids: group.select.value });
  async function load(route, params, target) {
    const current = ++serial;
    output.textContent = `Loading ${route}...`;
    try {
      const url = new URL(`/api/catalog/${route}`, base);
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (current !== serial) return;
      const entries = optionsFor(data, route);
      if (target && entries) {
        target.select.replaceChildren(new Option(`Select ${target.title}`, ''));
        entries.forEach(({ value, label }) => target.select.append(new Option(label, value)));
        target.select.disabled = false;
        output.textContent = `${entries.length} ${route} loaded.`;
      } else {
        output.textContent = `Review the ${route} response format before enabling the dropdown:\
${JSON.stringify(data, null, 2)}`;
      }
    } catch (error) {
      if (current === serial) output.textContent = `Unable to load ${route}: ${error.message}`;
    }
  }
  group.select.addEventListener('change', () => { ++serial; reset(); if (group.select.value) load('years', shared(), year); });
  year.select.addEventListener('change', () => { ++serial; reset(1); if (year.select.value) load('makes', { ...shared(), year_id: year.select.value }, make); });
  make.select.addEventListener('change', () => { ++serial; reset(2); if (make.select.value) load('models', { ...shared(), year_id: year.select.value, make_id: make.select.value }, model); });
  model.select.addEventListener('change', () => { partsButton.disabled = !model.select.value; });
  partsButton.addEventListener('click', () => load('parts', { ...shared(), year_id: year.select.value, make_id: make.select.value, model_id: model.select.value, page: '1', limit: '50' }, null));
}
