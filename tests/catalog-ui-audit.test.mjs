import {normalizeMaterialSearch} from '../assets/catalog-search.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {loadDataset,joinProducts} from '../src/lib/data.mjs';import {catalogSummaries} from '../src/render.mjs';import {translate} from '../assets/i18n.js';
const data=loadDataset(),products=joinProducts(data),summaries=catalogSummaries({data,products});
test('normalized carbon material search retains all 41 published records and appropriate candidate facts',()=>{
 const matched=summaries.filter(x=>x.frameSearch?.toLowerCase().includes('carbon'));assert.equal(matched.filter(x=>x.stage==='published').length,41);assert.ok(matched.some(x=>x.id==='candidate-xlab-rs9'));assert.ok(summaries.find(x=>x.id==='af01-frameset').frameSearch.includes('T47'));
});
test('both comparison sections construct native tables with scoped model and field headers',()=>{
 const script=fs.readFileSync(new URL('../assets/site.js',import.meta.url),'utf8');const source=script.slice(script.indexOf('  function comparisonGrid('),script.indexOf('  function renderComparison()',script.indexOf('  function comparisonGrid(')));
 const element=(tag,className='',text='')=>({tag,className,text,children:[],attrs:{},style:{setProperty(){}},setAttribute(k,v){this.attrs[k]=v;},append(...children){this.children.push(...children);}});
 for(const include of [true,false])for(const locale of ['en','zh-Hans','de']){
  const result=vm.runInNewContext(`(${source.trim()})(items,fields,include)`,{element,translate,locale,include,items:[{brand:'Brand',name:'A'},{brand:'Brand',name:'B'}],fields:[['Price',item=>element('div','',item.name)]],productHeader:item=>element('div','',item.name)});
  const table=result.children[0];assert.equal(table.tag,'table');const [head,body]=table.children;assert.equal(head.tag,'thead');assert.equal(body.tag,'tbody');assert.equal(head.children[0].tag,'tr');assert.equal(head.children[0].children.length,3);assert.ok(head.children[0].children.every(x=>x.tag==='th'&&x.scope==='col'));
  const row=body.children[0];assert.equal(row.tag,'tr');assert.equal(row.children[0].tag,'th');assert.equal(row.children[0].scope,'row');assert.ok(row.children.slice(1).every(x=>x.tag==='td'));
 }
});
test('core comparison instructions translate exactly before product-name patterns',()=>{
 for(const value of ['More details','Verdict','Use the arrow controls to reorder columns. The comparison link keeps this order.','Category-specific facts are comparable across these 3 selections.'])for(const locale of ['zh-Hans','de'])assert.notEqual(translate(value,locale),value);
 assert.equal(translate('More details','zh-Hans'),'更多详情');
 assert.equal(translate('Move AF01 right','zh-Hans'),'将 AF01 向右移动');
 assert.equal(translate('Remove AF01','zh-Hans'),'移除 AF01');
});
test('completed TT/track transcriptions retain literal source units and historical missing flags',()=>{
 for(const id of ['lightcarbon-lctt001','lightcarbon-lctt004','lightcarbon-lctr003']){
  const c=data.candidates.find(x=>x.id===id);assert.ok(c.facts['geometry numeric table']);assert.ok(c.missing.some(x=>/Independent stiffness.*unit ambiguity/.test(x)));assert.ok(!c.missing.some(x=>/chart transcription/.test(x)));assert.ok(c.prior_missing_observations[0].missing.some(x=>/chart transcription/.test(x)));
 }
 assert.match(data.candidates.find(x=>x.id==='lightcarbon-lctt001').facts['geometry numeric table'],/45°.*source-unit ambiguity/);
});

test('the actual material filter treats localized carbon terms as the same 41 published matches and localizes its chip',()=>{
 const script=fs.readFileSync(new URL('../assets/site.js',import.meta.url),'utf8');
 const matchSource=script.slice(script.indexOf('  function matchesTypedFilters('),script.indexOf('  function syncTireUnknownAvailability('));
 const chipSource=script.slice(script.indexOf('  function typedFilterChips('),script.indexOf('\n  function ',script.indexOf('  function typedFilterChips(')+5));
 const byId=new Map(summaries.map(item=>[item.id,item]));
 let expected;
 for(const term of ['carbon','碳纤维','碳纖維','Kohlefaser','Kohlenstofffaser']){
  const context={byId,frameFilter:{value:term},normalizeMaterialSearch,numberOrNull:()=>null,numericValue:()=>0,price:null,tire:null,tireUnknown:null,completeWeight:null,frameWeight:null,drivetrainFilter:null,categoryMinimum:null,category:null};
  const actual=summaries.filter(item=>item.stage==='published'&&vm.runInNewContext(`(${matchSource.trim()})(row)`,{...context,row:{dataset:{id:item.id}}})).map(x=>x.id).sort();
  assert.equal(actual.length,41,term);if(expected)assert.deepEqual(actual,expected);expected=actual;
  for(const locale of ['zh-Hans','de']){const chips=vm.runInNewContext(`(${chipSource.trim()})()`,{...context,translate,locale,categoryMinimumLabel:null,categoryMinimumUnit:null});assert.ok(chips[0][1].startsWith(translate('Frame',locale)+':'));assert.ok(chips[0][1].endsWith(term));}
 }
 assert.equal(normalizeMaterialSearch('  Ｔ４７ '),'t47');
});
