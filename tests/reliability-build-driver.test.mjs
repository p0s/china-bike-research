/** Real build driver with synthetic data/renderers; not a full catalog validation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const project=fileURLToPath(new URL('../',import.meta.url));
function fixture(t,mode='',base='') {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'bike-build-driver-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const dir of ['scripts','src/lib','assets','dist'])fs.mkdirSync(path.join(root,dir),{recursive:true});
 for(const f of ['scripts/build.mjs','src/lib/csv.mjs','src/lib/build-output.mjs'])fs.copyFileSync(path.join(project,f),path.join(root,f));
 fs.writeFileSync(path.join(root,'dist','previous.html'),'PREVIOUS GOOD BUILD');
 fs.writeFileSync(path.join(root,'src/lib/data.mjs'),`
 const platform={id:'p',category:'road',last_reviewed:'2026-09-01',frame:{},tire_clearance:{}};
 const brand={id:'brand',name:'=unsafe-text',manufacturing:{},last_reviewed:'2026-09-01'};
 const variant={id:'bike',name:'Bike',kind:'complete-bike',editorial:{verdict:'Known'}};
 const product={brand,platform,variant,prices:[],sources:[],videos:[],allInPrice:{low:100,high:200}};
 export const loadDataset=()=>({meta:{snapshot_date:'2026-09-01'},brands:[brand],platforms:[platform],variants:[variant],prices:[],sources:[],candidates:[],videos:[],images:[],groupsets:[],buildParts:[]});
 export const joinProducts=()=>[product]; export const joinCatalogCandidates=()=>[];
 export const validateDataset=()=>process.env.FAIL_BUILD==='validation'?['fixture failure']:[];
 export const categoryMetric=()=>({label:'Tire',value:'',details:[]});
 export const formatAllInPrice=()=> '¥100–200';export const formatPrice=()=> '¥100';
 export const maxClearance=()=>null;export const clearanceLongLabel=()=>'';
 `);
 fs.writeFileSync(path.join(root,'src/lib/landings.mjs'),'export const buildLandingPages=()=>({pages:[],brandPages:[]});');
 fs.writeFileSync(path.join(root,'src/lib/seo.mjs'),'export const latestDate=()=>"2026-09-01";export const sitemapXml=()=>"<urlset/>";');
 fs.writeFileSync(path.join(root,'src/render.mjs'),`
 export function renderHome(ctx){
 if(process.env.FAIL_BUILD==='render')throw Error('render failure');
 if(process.env.FAIL_BUILD==='budget')return 'x'.repeat(1_000_000);
 const target=process.env.FAIL_BUILD==='links'?ctx.base+'/missing/':process.env.FAIL_BUILD==='escape'?ctx.base+'/%2e%2e%2fsecret':ctx.base+'/models/bike/';
 return '<html><a href="'+target+'">Bike</a></html>';
 }
 export const renderModel=()=>'<html>Bike</html>';
 export const renderCandidateModel=renderModel,renderBikeBuilder=renderModel,renderElectronicGroupsets=renderModel,renderLandingPage=renderModel,renderMethodology=renderModel,renderPrivacy=renderModel,renderImagePolicy=renderModel,renderImageSources=renderModel,render404=renderModel;
 `);
 const result=spawnSync(process.execPath,[path.join(root,'scripts/build.mjs')],{encoding:'utf8',env:{...process.env,FAIL_BUILD:mode,GITHUB_ACTIONS:'false',GITHUB_REPOSITORY:'',PUBLIC_BASE_PATH:base,PUBLIC_SITE_URL:'https://example.invalid'}});
 return{root,result};
}
for(const mode of ['validation','render','budget','links','escape'])test(`build driver preserves previous output after ${mode} failure`,t=>{
 const {root,result}=fixture(t,mode);assert.notEqual(result.status,0);assert.equal(fs.readFileSync(path.join(root,'dist','previous.html'),'utf8'),'PREVIOUS GOOD BUILD');assert.equal(fs.readdirSync(root).some(x=>x.startsWith('.dist-stage-')),false);
});
for(const base of ['','/china-bike-research'])test(`build driver success at base ${base||'/'}`,t=>{
 const {root,result}=fixture(t,'',base);assert.equal(result.status,0,result.stderr);assert.equal(fs.existsSync(path.join(root,'dist','previous.html')),false);
 const csv=fs.readFileSync(path.join(root,'dist','data','catalog.csv'),'utf8');assert.match(csv,/'=unsafe-text/);
 const lines=csv.trimEnd().split('\n').map(l=>l.split(','));assert.equal(lines[1][lines[0].indexOf('storage')],'');
 const json=JSON.parse(fs.readFileSync(path.join(root,'dist','data','catalog.json')));assert.equal(json.products[0].brand.name,'=unsafe-text');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist','build-manifest.json')));assert.equal(manifest.base,base);
});
