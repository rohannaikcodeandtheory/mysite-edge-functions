// EDS Parts Finder: site, locale and PDM brand-code diagnostics.
// Postman brand codes are TEST EXAMPLES, not verified mappings for these sites.
const create = (tag, text) => { const el = document.createElement(tag); if (text != null) el.textContent = text; return el; };
const dropdown = (name) => { const label = create('label', name); const select = create('select'); select.setAttribute('aria-label', name); label.append(select); return { label, select, name }; };
const profiles = {
  'driv-us': { title: 'DRiV — North America (corporate)', brand: 'corporate', country: 'US', locale: 'en_US', source: 'https://www.drivparts.com/' },
  'driv-de': { title: 'DRiV — Germany', brand: 'corporate', country: 'DE', locale: 'de_DE', source: 'https://www.drivparts.com/de-de/catalogue.html' },
  'moog-us': { title: 'MOOG — North America', brand: 'moog', country: 'US', locale: 'en_US', source: 'https://www.moogparts.com/find-my-part.html' },
  'moog-eu': { title: 'MOOG — Europe', brand: 'moog', country: 'DE', locale: 'en_GB', source: 'https://www.moogparts.com/en-eu/catalogue.html' },
};
const examples = {
  '': 'Use configured mapping (recommended)',
  BDCM: 'BDCM — Postman years/makes/models example',
  'BDCN,BCKM': 'BDCN,BCKM — Postman equipment example',
  BBKH: 'BBKH — Postman concatenated equipment example',
  custom: 'Custom brand codes (testing only)',
};
const optionsFor = (data, route) => {
  const values = Array.isArray(data) ? data : data?.[route] ?? data?.data?.[route] ?? data?.results;
  if (!Array.isArray(values)) return null;
  return values.map((item) => {
    if (typeof item !== 'object' || item === null) return { value: String(item), label: String(item) };
    const value = item.id ?? item.year_id ?? item.make_id ?? item.model_id ?? item.value;
    return value == null ? null : { value: String(value), label: String(item.name ?? item.label ?? item.year ?? item.value ?? value) };
  }).filter(Boolean);
};
export default function decorate(block) {
  block.replaceChildren();
  const site = dropdown('Reference website');
  Object.entries(profiles).forEach(([key, p]) => site.select.append(new Option(p.title, key)));
  const link = create('a', 'Open reference website'); link.target = '_blank'; link.rel = 'noopener noreferrer';
  const warning = create('p'); warning.className = 'parts-finder-warning';
  const mode = dropdown('API environment');
  mode.select.append(new Option('Deployed / same-origin', 'deployed'), new Option('Local Edge Function (127.0.0.1:7676)', 'local'));
  const endpoint = create('input'); endpoint.type = 'url'; endpoint.placeholder = 'Custom API origin (optional)'; endpoint.setAttribute('aria-label', 'Custom API origin');
  const brand = dropdown('Site brand'); ['corporate', 'moog', 'walker', 'gpi'].forEach((v) => brand.select.append(new Option(v, v)));
  const codes = dropdown('PDM brand codes'); Object.entries(examples).forEach(([key, label]) => codes.select.append(new Option(label, key)));
  const customCodes = create('input'); customCodes.placeholder = 'e.g. BDCM'; customCodes.setAttribute('aria-label', 'Custom PDM brand codes'); customCodes.hidden = true;
  const country = dropdown('Country'); [['US','US'],['CA','CA'],['MX','MX'],['DE','DE'],['GB','GB'],['FR','FR']].forEach(([label,value])=>country.select.append(new Option(label,value)));
  const locale = dropdown('Locale'); ['en_US','de_DE','en_GB','fr_FR','es_MX'].forEach((v)=>locale.select.append(new Option(v,v)));
  const group = dropdown('Vehicle group'); group.select.append(new Option('Select vehicle group',''), new Option('Groups 2,8','2,8'), new Option('Group 7','7'));
  const year = dropdown('Year'); const make = dropdown('Make'); const model = dropdown('Model');
  const run = create('button','Find Parts'); const health = create('button','Test API health');
  const postmanMode = create('input'); postmanMode.type='checkbox'; postmanMode.checked=true; postmanMode.setAttribute('aria-label','Use Postman-compatible vehicle request');
  const postmanLabel = create('label','Use Postman-compatible vehicle request (recommended for debugging 400 errors)'); postmanLabel.className='parts-finder-toggle'; postmanLabel.prepend(postmanMode);
  const copyUrl=create('button','Copy last request URL'); copyUrl.type='button'; copyUrl.disabled=true; let lastUrl=''; copyUrl.addEventListener('click',()=>{if(lastUrl)navigator.clipboard?.writeText(lastUrl).then(()=>{status.textContent='Request URL copied';}).catch(()=>{status.textContent='Clipboard unavailable; copy URL from JSON below';});});
  const route = dropdown('Direct API test');
  ['years','makes','models','parts','parts-light','search','engine-mfrs','engine-bases','engine-usages','engine-versions-ld','engine-parts-ld'].forEach((v)=>route.select.append(new Option(v,v)));
  const extra = create('input'); extra.placeholder = 'Additional query: part_number=...'; extra.setAttribute('aria-label','Additional query parameters');
  const test = create('button','Test selected API'); const status = create('p'); status.setAttribute('aria-live','polite');
  const output = create('pre'); output.className = 'parts-finder-response';
  const header=create('div'); header.className='parts-finder-header'; const heading=create('h2','Find the right part'); const subtitle=create('p','Choose a website and brand, then search vehicles or inspect the PDM API response.');header.append(heading,subtitle);
  const settings=create('section');settings.className='parts-finder-panel';settings.append(create('h3','1. Website & API settings'),site.label,link,mode.label,endpoint,brand.label,codes.label,customCodes,country.label,locale.label,postmanLabel,warning);
  const vehicle=create('section');vehicle.className='parts-finder-panel';vehicle.append(create('h3','2. Vehicle selection'),group.label,year.label,make.label,model.label,run);
  const diagnostics=create('section');diagnostics.className='parts-finder-panel';diagnostics.append(create('h3','3. API diagnostics'),health,route.label,extra,test,copyUrl,status,output);
  block.append(header,settings,vehicle,diagnostics);
  const fields = [year,make,model];
  const reset = (index=0) => { fields.slice(index).forEach(({select,name})=>{select.replaceChildren(new Option(`Select ${name}`,''));select.disabled=true;});run.disabled=true; };
  let generation = 0; reset();
  const updateWarning = () => {
    const profile = profiles[site.select.value]; link.href = profile.source;
    warning.textContent = `${codes.select.value ? 'Postman code override selected: testing only. ' : 'Using server-side brand mapping. '}The uploaded API configuration is North American; German/European catalog compatibility and locale/region mapping are NOT verified.`;
  };
  const applyProfile = () => { const p=profiles[site.select.value]; brand.select.value=p.brand; country.select.value=p.country; locale.select.value=p.locale; ++generation; reset(); updateWarning(); };
  site.select.addEventListener('change',applyProfile);
  postmanMode.addEventListener('change',()=>{++generation;reset();});
  codes.select.addEventListener('change',()=>{customCodes.hidden=codes.select.value!=='custom';++generation;reset();updateWarning();});
  [brand.select,country.select,locale.select,customCodes].forEach(el=>el.addEventListener('change',()=>{++generation;reset();}));
  codes.select.value='BDCM';applyProfile();
  const base = () => new URL(endpoint.value.trim() || (mode.select.value==='local'?'http://127.0.0.1:7676':window.location.origin));
  const shared = () => {
    const p={brand:brand.select.value,country_code:country.select.value,locale:locale.select.value,vehicle_group_ids:group.select.value};
    if(postmanMode.checked) p.postman_mode='1';
    const selected=codes.select.value==='custom'?customCodes.value.trim():codes.select.value;
    if(selected) { if(!/^[A-Za-z0-9_,.-]{1,500}$/.test(selected)) throw new Error('Invalid PDM brand codes'); p.brand_codes=selected; }
    return p;
  };
  async function load(name, params={}, target=null) {
    const current=++generation;
    try {
      const url=new URL(`/api/catalog/${name}`,base());
      Object.entries(params).forEach(([key,value])=>{if(value!==''&&value!=null)url.searchParams.set(key,value);});
      lastUrl=url.toString();copyUrl.disabled=false;status.textContent=`Loading ${name}...`;
      const start=performance.now(); const response=await fetch(url,{headers:{Accept:'application/json'}});
      const elapsed=Math.round(performance.now()-start); const body=await response.text();
      if(current!==generation)return;
      let data; try {data=JSON.parse(body);}catch{data={raw:body.slice(0,3000)};}
      const id=response.headers.get('X-Request-ID')||data?.error?.requestId||'unavailable';
      status.textContent=`${name}: HTTP ${response.status} | ${elapsed} ms | request ID ${id}`;
      output.textContent=JSON.stringify({requestUrl:url.toString(),status:response.status,requestId:id,data},null,2);
      if(!response.ok)return;
      const entries=optionsFor(data,name);
      if(target&&entries){target.select.replaceChildren(new Option(`Select ${target.name}`,''));entries.forEach(({value,label})=>target.select.append(new Option(label,value)));target.select.disabled=entries.length===0;status.textContent+=` | ${entries.length} results`;}
    }catch(error){if(current===generation){status.textContent=`Request failed: ${error.message}`;output.textContent='Check the Edge Function, CORS, brand mapping and locale/region configuration.';}}
  }
  const request = (name, additional={}) => { try {load(name,{...shared(),...additional});}catch(error){status.textContent=error.message;} };
  group.select.addEventListener('change',()=>{++generation;reset();if(group.select.value)try{load('years',shared(),year);}catch(e){status.textContent=e.message;}});
  year.select.addEventListener('change',()=>{++generation;reset(1);if(year.select.value)try{load('makes',{...shared(),year_id:year.select.value},make);}catch(e){status.textContent=e.message;}});
  make.select.addEventListener('change',()=>{++generation;reset(2);if(make.select.value)try{load('models',{...shared(),year_id:year.select.value,make_id:make.select.value},model);}catch(e){status.textContent=e.message;}});
  model.select.addEventListener('change',()=>{run.disabled=!model.select.value;});
  run.addEventListener('click',()=>request('parts',{year_id:year.select.value,make_id:make.select.value,model_id:model.select.value,page:'1',limit:'50'}));
  health.addEventListener('click',()=>load('health'));
  test.addEventListener('click',()=>{const additional=new URLSearchParams(extra.value);const params={year_id:year.select.value,make_id:make.select.value,model_id:model.select.value};additional.forEach((v,k)=>{params[k]=v;});request(route.select.value,params);});
}
