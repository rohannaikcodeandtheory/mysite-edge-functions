import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogRequest } from '../src/catalog.js';
import { getRegionId } from '../src/country.js';
import { handleCatalog } from '../src/handler.js';
const base='https://pdm.example.test/v1';
const mapping={brandCodes:{corporate:'verified-test-code'}};
const req=(route,params='vehicle_group_ids=2%2C8')=>new Request(`https://site.test/api/catalog/${route}?${params}`);
const options={baseUrl:base,regionId:'1,2',dynamicTypes:'engine_base',token:'test-token',...mapping};
test('country mappings reject unknown country',()=>{assert.equal(getRegionId('US'),'1,2');assert.equal(getRegionId('CA'),'1,4');assert.throws(()=>getRegionId('ZZ'),TypeError);});
test('years resolves configured brand mapping',()=>{const u=buildCatalogRequest('years','brand=corporate&locale=en_US&country_code=US&vehicle_group_ids=2%2C8',base,'1,2','',mapping);assert.equal(u.pathname,'/v1/vehicles/years');assert.equal(u.searchParams.get('brand_codes'),'verified-test-code');assert.equal(u.searchParams.get('region_id'),'1,2');assert.equal(u.searchParams.get('locale'),'en_US');assert.equal(u.searchParams.get('vehicle_group_ids'),'2,8');});
test('years handles live vehicle groups and case-insensitive brand/country',()=>{
	for (const [brand, country, groups] of [['corporate','US','2,8'],['CORPORATE','us','7']]) {
		const params = new URLSearchParams({ brand, locale: 'en_US', country_code: country, vehicle_group_ids: groups });
		const u = buildCatalogRequest('years',params,base,'1,2','',mapping);
		assert.equal(u.searchParams.get('brand_codes'),'verified-test-code');
		assert.equal(u.searchParams.get('vehicle_group_ids'),groups);
		assert.equal(u.searchParams.get('region_id'),'1,2');
	}
});
test('years includes AEM custom fields from config',()=>{const fields='[{"type":"Sales Region: US","value":"1"}]';const u=buildCatalogRequest('years','brand=corporate&locale=en_US&country_code=US&vehicle_group_ids=2%2C8',base,'1,2','',{...mapping,customFields:fields});assert.equal(u.searchParams.get('custom_fields'),fields);});
test('years accepts AEM URL-encoded custom fields from config',()=>{const fields='[{"type":"Sales Region: US","value":"1"}]';const u=buildCatalogRequest('years','brand=corporate&locale=en_US&country_code=US&vehicle_group_ids=2%2C8',base,'1,2','',{...mapping,customFields:encodeURIComponent(fields)});assert.equal(u.searchParams.get('custom_fields'),fields);});
test('missing corporate mapping fails closed',()=>assert.throws(()=>buildCatalogRequest('years','brand=corporate&vehicle_group_ids=2&country_code=US',base,'1,2',''),/brand-code mapping not configured/));
test('explicit brand_codes permits manual verification without a mapping',()=>{const u=buildCatalogRequest('years','brand=corporate&brand_codes=BDCM&vehicle_group_ids=2&country_code=US&no_cache=1793973951856',base,'1,2','');assert.equal(u.searchParams.get('brand_codes'),'BDCM');assert.equal(u.searchParams.has('no_cache'),false);});
test('makes and models include IDs',()=>{const u=buildCatalogRequest('models','vehicle_group_ids=2&year_id=2027&make_id=12',base,'1,2','',mapping);assert.equal(u.searchParams.get('make_id'),'12');});
test('parts requires dynamic types',()=>assert.throws(()=>buildCatalogRequest('parts','vehicle_group_ids=2&year_id=2027&make_id=1&model_id=2',base,'1,2','',mapping),/DYNAMIC/));
test('parts includes pagination and segments',()=>{const u=buildCatalogRequest('parts','vehicle_group_ids=2&year_id=2027&make_id=1&model_id=2',base,'1,2','engine_base',mapping);assert.equal(u.searchParams.get('limit'),'50');assert.equal(u.searchParams.get('sort_by'),'part_type_sequence');});
test('part number search route',()=>{const u=buildCatalogRequest('search','brand_codes=abc&part_number=1234',base,'1,2','',mapping);assert.equal(u.pathname,'/v1/products/search');assert.equal(u.searchParams.get('part_number'),'1234');});
test('engine manufacturer route',()=>{const u=buildCatalogRequest('engine-mfrs','vehicle_group_ids=2',base,'1,2','',mapping);assert.equal(u.pathname,'/v1/vehicles/engine_mfrs');});
test('all supported routes build their PDM paths',()=>{
	const engineBaseId='engine_base_block_type_id=3&engine_base_liter_id=38';
	const engineVersionId='engine_cylinder_head_type_id=7&engine_fuel_type_id=5';
	const cases=[
		['years','brand=corporate&vehicle_group_ids=2%2C8','/v1/vehicles/years'],
		['makes','brand=corporate&vehicle_group_ids=2%2C8&year_id=2026','/v1/vehicles/makes'],
		['models','brand=corporate&vehicle_group_ids=2%2C8&year_id=2026&make_id=16','/v1/vehicles/models'],
		['parts','brand=corporate&vehicle_group_ids=2%2C8&year_id=2026&make_id=16&model_id=26418','/v1/products/listings/full'],
		['parts-light','brand=corporate&vehicle_group_ids=2%2C8&year_id=2026&make_id=16&model_id=26418&digital_assets=1','/v1/products/listings'],
		['search','brand=corporate&part_number=TEST123','/v1/products/search'],
		['engine-mfrs','brand=corporate&vehicle_group_ids=7','/v1/vehicles/engine_mfrs'],
		['engine-bases','brand=corporate&vehicle_group_ids=7&engine_mfr_id=25','/v1/vehicles/engine_bases'],
		['engine-usages',new URLSearchParams({brand:'corporate',vehicle_group_ids:'7',engine_mfr_id:'25',engine_base_id:engineBaseId}),'/v1/vehicles/engine_usages'],
		['engine-versions-ld',new URLSearchParams({brand:'corporate',vehicle_group_ids:'7',engine_mfr_id:'25',engine_base_id:engineBaseId,engine_usage_ids:'5',locale:'en_US'}),'/v1/vehicles/engine_versions/light_duty'],
		['engine-parts-ld',new URLSearchParams({brand:'corporate',vehicle_group_ids:'7',engine_mfr_id:'25',engine_base_id:engineBaseId,engine_usage_ids:'5',engine_version_id:engineVersionId,page:'1',limit:'20'}),'/v1/products/engine_listings/light_duty'],
	];
	for (const [route,params,path] of cases) assert.equal(buildCatalogRequest(route,params,base,'1,2','engine_base',mapping).pathname,path,route);
});
test('light-duty engine routes translate AEM fragments and implicit filters',()=>{
	const baseParams=new URLSearchParams({brand:'corporate',vehicle_group_ids:'7',engine_mfr_id:'25',engine_base_id:'engine_base_block_type_id=3&engine_base_liter_id=38'});
	const usageParams=new URLSearchParams({brand:'corporate',vehicle_group_ids:'7',engine_mfr_id:'25',engine_base_id:'engine_base_block_type_id=3&engine_base_liter_id=38',engine_usage_ids:'5',locale:'en_US'});
	const partsParams=new URLSearchParams({...Object.fromEntries(usageParams),engine_version_id:'engine_cylinder_head_type_id=7&engine_fuel_type_id=5',page:'1',limit:'20'});
	const usages=buildCatalogRequest('engine-usages',baseParams,base,'1,2','',mapping);
	assert.equal(usages.searchParams.get('engine_base_block_type_id'),'3');
	assert.equal(usages.searchParams.get('return_implicit_results'),'1');
	const versions=buildCatalogRequest('engine-versions-ld',usageParams,base,'1,2','',mapping);
	assert.equal(versions.searchParams.get('vehicle_type_ids'),'5');
	assert.equal(versions.searchParams.get('implicit_filter_keys'),'engine_base_block_type,engine_base_cylinder,engine_base_liter,engine_base_cubic_inch,engine_base_cubic_centimeter');
	const parts=buildCatalogRequest('engine-parts-ld',partsParams,base,'1,2','',mapping);
	assert.equal(parts.searchParams.get('engine_cylinder_head_type_id'),'7');
	assert.equal(parts.searchParams.get('engine_fuel_type_id'),'5');
	assert.equal(parts.searchParams.get('dynamic_sub_config_types'),'drive,engine_base,sub_model,engine_vin,engine_designation');
});
test('upstream JSON success and request ID',async()=>{const r=await handleCatalog(req('years'),{...options,fetchUpstream:async()=>Response.json({years:[2027]})});assert.equal(r.status,200);assert.ok(r.headers.get('X-Request-ID'));assert.deepEqual(await r.json(),{years:[2027]});});
test('upstream 401 safe error',async()=>{const r=await handleCatalog(req('years'),{...options,fetchUpstream:async()=>new Response('secret',{status:401})});assert.equal(r.status,502);assert.equal((await r.json()).error.code,'PDM_AUTH_FAILED');});
test('invalid JSON returns 502',async()=>{const r=await handleCatalog(req('years'),{...options,fetchUpstream:async()=>new Response('broken',{headers:{'content-type':'application/json'}})});assert.equal(r.status,502);});
test('invalid country returns 400',async()=>{const r=await handleCatalog(req('years','country_code=ZZ&vehicle_group_ids=2'),{...options,fetchUpstream:async()=>Response.json({})});assert.equal(r.status,400);});
test('health works without token',async()=>{const r=await handleCatalog(req('health'));assert.equal(r.status,200);assert.equal((await r.json()).check,'liveness');});
test('timeout returns 504',async()=>{const r=await handleCatalog(req('years'),{...options,timeoutMs:5,fetchUpstream:async()=>new Promise(()=>{})});assert.equal(r.status,504);});

test('GPI years uses VCDB and region only',()=>{const u=buildCatalogRequest('years','brand=gpi&vehicle_group_ids=2&country_code=US',base,'1,2','',mapping);assert.equal(u.pathname,'/v1/vcdb/years');assert.deepEqual([...u.searchParams.keys()],['region_id']);});
test('years does not send pagination',()=>{assert.throws(()=>buildCatalogRequest('years','vehicle_group_ids=2&page=1',base,'1,2','',mapping),/Unsupported parameter/);});
test('parts-light includes legacy dynamic config',()=>{const u=buildCatalogRequest('parts-light','vehicle_group_ids=2&year_id=2026&make_id=1&model_id=2&digital_assets=1',base,'1,2','',mapping);assert.equal(u.searchParams.get('digital_assets'),'1');assert.match(u.searchParams.get('dynamic_sub_config_types'),/wheel_base/);});
test('configured region used without country override',()=>{const u=buildCatalogRequest('years','vehicle_group_ids=2',base,'9','',mapping);assert.equal(u.searchParams.get('region_id'),'9');});
test('response sorts years descending',async()=>{const r=await handleCatalog(req('years'),{...options,fetchUpstream:async()=>Response.json({years:[{id:2020},{id:2027}]})});assert.deepEqual((await r.json()).years.map(x=>x.id),[2027,2020]);});
test('response sorts makes alphabetically',async()=>{const r=await handleCatalog(req('makes','vehicle_group_ids=2&year_id=2027'),{...options,fetchUpstream:async()=>Response.json({makes:[{id:2,value:'Toyota'},{id:1,value:'Ford'}]})});assert.deepEqual((await r.json()).makes.map(x=>x.value),['Ford','Toyota']);});
test('invalid method is 405 with Allow header',async()=>{const r=await handleCatalog(new Request('https://site.test/api/catalog/years',{method:'POST'}));assert.equal(r.status,405);assert.equal(r.headers.get('Allow'),'GET');});
test('unknown route is 404',async()=>{const r=await handleCatalog(req('not-supported'));assert.equal(r.status,404);});
test('upstream 429 is 503',async()=>{const r=await handleCatalog(req('years'),{...options,fetchUpstream:async()=>new Response('',{status:429})});assert.equal(r.status,503);assert.equal((await r.json()).error.code,'PDM_RATE_LIMITED');});
test('upstream empty list is 200',async()=>{const r=await handleCatalog(req('years'),{...options,fetchUpstream:async()=>Response.json({years:[]})});assert.equal(r.status,200);});
