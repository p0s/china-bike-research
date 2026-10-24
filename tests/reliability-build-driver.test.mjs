/** Real build driver with synthetic data/renderers; not a full catalog validation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const project=fileURLToPath(new URL('../',import.meta.url));
function fixture(t,mode='',base='',siteUrl='https://example.invalid') {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'bike-build-driver-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const dir of ['scripts','src/lib','assets','dist'])fs.mkdirSync(path.join(root,dir),{recursive:true});
 for(const f of ['scripts/build.mjs','scripts/check-links.mjs','src/lib/indexnow.mjs','src/lib/csv.mjs','src/lib/build-output.mjs','src/lib/regional-prices.mjs','src/lib/price-evidence.mjs','src/lib/analytics-context.mjs','assets/regional-prices.js'])fs.copyFileSync(path.join(project,f),path.join(root,f));
 fs.writeFileSync(path.join(root,'dist','previous.html'),'PREVIOUS GOOD BUILD');
 fs.writeFileSync(path.join(root,'src/lib/data.mjs'),`
 const platform={id:'p',category:'road',last_reviewed:'2026-09-01',frame:{},tire_clearance:{}};
 const brand={id:'brand',name:'=unsafe-text',manufacturing:{},last_reviewed:'2026-09-01'};
 const variant={id:'bike',name:'Bike',kind:'complete-bike',editorial:{verdict:'Known'}};
 const product={brand,platform,variant,prices:[],sources:[],videos:[],allInPrice:{low:100,high:200}};
 export const loadDataset=()=>({meta:{snapshot_date:'2026-09-01'},brands:[brand],platforms:[platform],variants:[variant],prices:[],sources:[],candidates:[],videos:[],images:[],groupsets:[],buildParts:[],wheelsets:[]});
 export const joinProducts=()=>[product]; export const joinCatalogCandidates=()=>[];
 export const validateDataset=()=>process.env.FAIL_BUILD==='validation'?['fixture failure']:[];
 export const categoryMetric=()=>({label:'Tire',value:'',details:[]});
 export const formatAllInPrice=()=> '¥100–200';export const formatPrice=()=> '¥100';
 export const maxClearance=()=>null;export const clearanceLongLabel=()=>'';
 `);
 fs.writeFileSync(path.join(root,'src/lib/posts.mjs'),"export const loadPosts=()=>[];export const validatePostReferences=()=>{};export const renderBlogIndex=()=>'<html>Blog</html>';export const renderPost=()=>'<html>Post</html>';export const postLastmod=()=> '2026-09-18';");
 fs.writeFileSync(path.join(root,'src/lib/build-cost-reference.mjs'),"export const buildCostReferenceCsv=()=> 'id,recorded_cny\\nfixture,\\n';");
 fs.writeFileSync(path.join(root,'src/lib/geometry-tool.mjs'),"export const renderGeometryTool=()=>'<html>Geometry</html>';");
 fs.writeFileSync(path.join(root,'src/lib/i18n.mjs'),"export const LOCALES=['en','zh-Hans'];export const localePath=(route,locale)=>locale==='zh-Hans'?'/zh'+route:route;export const localizedCatalogPayload=(value)=>value;");
 fs.writeFileSync(path.join(root,'src/lib/indexing.mjs'),"export const candidateIndexable=()=>false;");
 fs.writeFileSync(path.join(root,'src/lib/post-publication.mjs'),"export const loadSchedule=()=>({entries:[]});export const publishedPosts=posts=>posts;");
 fs.writeFileSync(path.join(root,'src/lib/landings.mjs'),'export const buildLandingPages=()=>({pages:[],brandPages:[]});');
 fs.writeFileSync(path.join(root,'src/lib/seo.mjs'),'export const latestDate=()=>"2026-09-01";export const sitemapXml=({siteUrl,base})=>process.env.FAIL_BUILD==="orphan"?`<urlset><url><loc>${siteUrl}${base}/geometry/</loc></url></urlset>`:"<urlset/>";');
 fs.writeFileSync(path.join(root,'src/render.mjs'),`
 export function renderHome(ctx){
 if(process.env.FAIL_BUILD==='render')throw Error('render failure');
 if(process.env.FAIL_BUILD==='budget')return 'x'.repeat(1_005_001);
 if(process.env.FAIL_BUILD==='fragments')return '<html><a href="'+ctx.base+'/models/bike/#missing">Bike</a></html>';
 if(process.env.FAIL_BUILD==='responsive')return '<html><img srcset="'+ctx.base+'/assets/missing.webp 2x"></html>';
 if(process.env.FAIL_BUILD==='absolute')return '<html><a href="'+ctx.siteUrl+ctx.base+'/missing/">Bike</a></html>';
 const target=process.env.FAIL_BUILD==='links'?ctx.base+'/missing/':process.env.FAIL_BUILD==='escape'?ctx.base+'/%2e%2e%2fsecret':ctx.base+'/models/bike/';
 return '<html><a href="'+target+'">Bike</a></html>';
 }
 export const catalogSummaries=()=>[];
 export const renderModel=()=>'<html>Bike</html>';
 export const renderCandidateModel=renderModel,renderBikeBuilder=renderModel,renderElectronicGroupsets=renderModel,renderCarbonWheels=renderModel,renderLandingPage=renderModel,renderMethodology=renderModel,renderPrivacy=renderModel,renderImagePolicy=renderModel,renderImageSources=renderModel,render404=renderModel;
 `);
 const result=spawnSync(process.execPath,[path.join(root,'scripts/build.mjs')],{encoding:'utf8',env:{...process.env,FAIL_BUILD:mode,GITHUB_ACTIONS:'false',GITHUB_REPOSITORY:'',PUBLIC_BASE_PATH:base,PUBLIC_SITE_URL:siteUrl}});
 return{root,result};
}
for(const mode of ['validation','render','budget','links','escape','fragments','responsive','absolute','orphan'])test(`build driver preserves previous output after ${mode} failure`,t=>{
 const {root,result}=fixture(t,mode);assert.notEqual(result.status,0);assert.equal(fs.readFileSync(path.join(root,'dist','previous.html'),'utf8'),'PREVIOUS GOOD BUILD');assert.equal(fs.readdirSync(root).some(x=>x.startsWith('.dist-stage-')),false);
});
for(const base of ['','/china-bike-research'])test(`build driver success at base ${base||'/'}`,t=>{
 const {root,result}=fixture(t,'',base);assert.equal(result.status,0,result.stderr);assert.equal(fs.existsSync(path.join(root,'dist','previous.html')),false);
 const csv=fs.readFileSync(path.join(root,'dist','data','catalog.csv'),'utf8');assert.match(csv,/'=unsafe-text/);
 const lines=csv.trimEnd().split('\n').map(l=>l.split(','));assert.equal(lines[1][lines[0].indexOf('storage')],'');
 const json=JSON.parse(fs.readFileSync(path.join(root,'dist','data','catalog.json')));assert.equal(json.products[0].brand.name,'=unsafe-text');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist','build-manifest.json')));assert.equal(manifest.base,base);
 const regional=JSON.parse(fs.readFileSync(path.join(root,'dist','data','regional-prices.json')));assert.deepEqual(regional.offers,[]);assert.equal(regional.rates,null);
 assert.equal(fs.existsSync(path.join(root,'dist','indexnow-manifest.json')),false);
});
test('production build publishes a key and only indexable public page hashes',t=>{
 const {root,result}=fixture(t,'','','https://chinesebikes.xyz');assert.equal(result.status,0,result.stderr);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist','indexnow-manifest.json')));
 const build=JSON.parse(fs.readFileSync(path.join(root,'dist','build-manifest.json')));
 assert.equal(Object.keys(manifest.pages).length,build.counts.indexable_pages);
 assert.ok(manifest.pages['https://chinesebikes.xyz/geometry/']);
 assert.equal(Object.keys(manifest.pages).some(url=>url.includes('404')),false);
 const keyFiles=fs.readdirSync(path.join(root,'dist')).filter(file=>/^[a-f0-9]{32}\.txt$/.test(file));
 assert.equal(keyFiles.length,1);assert.equal(fs.readFileSync(path.join(root,'dist',keyFiles[0]),'utf8').trim(),keyFiles[0].slice(0,-4));
});
