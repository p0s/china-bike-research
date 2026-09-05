from playwright.sync_api import sync_playwright
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlencode
import json,traceback,time
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit
import json,re,base64,mimetypes
import argparse,os,shutil
PROJECT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Offline Chromium DOM regressions; no live navigation or source verification.')
parser.add_argument('--cdp',help='Explicit isolated browser CDP endpoint; never a personal browser.')
parser.add_argument('--case',help='Run only cases containing this text; skip overview screenshots.')
parser.add_argument('--site',type=Path,default=PROJECT/'dist' if (PROJECT/'dist').is_dir() else PROJECT.parent/'site')
parser.add_argument('--assets',type=Path,default=PROJECT/'assets')
parser.add_argument('--reports',type=Path,default=PROJECT/'validation' if (PROJECT/'dist').is_dir() else PROJECT.parent/'validation')
args=parser.parse_args()
SITE=args.site.resolve();ASSETS=args.assets.resolve();REPORTS=args.reports.resolve()
(REPORTS/'screenshots').mkdir(parents=True,exist_ok=True)
ORIGIN='https://china-bikes.p0s.eu'
def load(page,path='/',stored=None,blocked=False,images=False):
 f=SITE/urlsplit(path).path.lstrip('/')
 if f.is_dir(): f=f/'index.html'
 soup=BeautifulSoup(f.read_text(),'html.parser')
 for s in soup.find_all('script'):
  if s.get('type') not in ('application/json','application/ld+json'):s.decompose()
 for s in soup.select('link[rel=stylesheet]'):s.decompose()
 style=soup.new_tag('style');style.string=(ASSETS/'site.css').read_text();soup.head.append(style)
 for im in soup.select('img'):
  im.attrs.pop('srcset',None)
  source=im.get('src','')
  local=SITE/urlsplit(source).path.lstrip('/')
  if not source.startswith(('http:', 'https:')) and local.is_file():
   im['src']='data:'+str(mimetypes.guess_type(str(local))[0])+';base64,'+base64.b64encode(local.read_bytes()).decode()
  else: im['src']='data:image/png;base64,INVALID' # No remote requests or substitute product photography.
 if images:
  from PIL import Image
  import io
  samples=[]
  for color in [(1,2,3),(4,5,6),(7,8,9),(10,11,12)]:
   f=io.BytesIO();Image.new('RGB',(3,3),color).save(f,format='PNG');samples.append('data:image/png;base64,'+base64.b64encode(f.getvalue()).decode())
  for index,button in enumerate(soup.select('[data-gallery-thumb]')):
   sample=samples[index%len(samples)];button['data-gallery-src']=sample
   if button.img:button.img['src']=sample

 page.set_content(str(soup),wait_until='domcontentloaded')
 setup="""({url,stored,blocked})=>{
 window.__url=new URL(url);window.__errors=[];window.addEventListener('error',e=>__errors.push(e.message));
 window.__values=new Map(Object.entries(stored));
 window.__store={getItem(k){if(blocked)throw Error('Storage blocked');return __values.get(k)??null},setItem(k,v){if(blocked)throw Error('Storage blocked');__values.set(k,String(v))},removeItem(k){if(blocked)throw Error('Storage blocked');__values.delete(k)}};
 window.__stack=[url];window.__index=0;
 window.__history={pushState(a,b,u){__url.href=new URL(u,__url).href;__stack.splice(++window.__index);__stack.push(__url.href)},replaceState(a,b,u){__url.href=new URL(u,__url).href;__stack[__index]=__url.href}};
 window.__back=()=>{if(__index>0){__url.href=__stack[--window.__index];dispatchEvent(new PopStateEvent('popstate'))}};
 window.__forward=()=>{if(__index<__stack.length-1){__url.href=__stack[++window.__index];dispatchEvent(new PopStateEvent('popstate'))}};
 }"""
 page.evaluate(setup,dict(url=ORIGIN+path,stored=stored or {},blocked=blocked))
 modules=['compare-state.js']
 site=(ASSETS/'site.js').read_text()
 modules += re.findall(r"from './([^']+)';",site)
 code='\n'.join((ASSETS/m).read_text().replace('export ','') for m in dict.fromkeys(modules))
 site=re.sub(r'^import .*?;\n','',site,flags=re.M|re.S,count=len(re.findall(r'^import ',site,re.M))) if False else re.sub(r'^import [^;]+;\n','',site,flags=re.M)
 page.add_script_tag(content='{ const location=window.__url, history=window.__history, localStorage=window.__store;\n'+code+'\n'+site+'\n}')
 page.wait_for_timeout(100)
 return page

results=[]
checks=[]
def case(name):
 def reg(fn):checks.append((name,fn));return fn
 return reg

def eq(actual,expected):assert actual==expected,(actual,expected)
def slot(page,name):return page.locator(f'[data-build-slot="{name}"] [data-build-part-select]')
def field(page,name,key):return page.locator(f'[data-build-slot="{name}"] [data-build-{key}]')
def new(page,path='/',**kwargs):load(page,path,**kwargs)

@case('theme cycles through all modes when browser storage is denied')
def _(p):
 new(p,blocked=True);out=[]
 for _ in range(3):p.locator('[data-theme-control]').click();out.append(p.locator('[data-theme-label]').inner_text())
 eq(out,['Light','Dark','System'])
@case('system appearance changes do not override explicit theme')
def _(p):
 new(p,blocked=True);p.locator('[data-theme-control]').click();p.emulate_media(color_scheme='dark');eq(p.locator('html').get_attribute('data-theme'),'light')
@case('descending price puts every unknown after known prices')
def _(p):
 new(p);p.locator('[data-show-all-models]').click();p.locator('[data-sort]').select_option('price-desc')
 values=p.locator('[data-product-row]:visible').evaluate_all('(rows)=>rows.map(r=>r.dataset.priceSort??"")')
 known=[float(x) for x in values if x!=''];eq(known,sorted(known,reverse=True));eq(values[:len(known)],[v for v in values if v!=''])
@case('search typing is one undoable edit, and Forward restores the query')
def _(p):
 new(p);f=p.locator('[data-filter-search]');f.fill('incolor');f.type(' sr');before=p.evaluate('__index');p.evaluate('__back()');eq(f.input_value(),'');p.evaluate('__forward()');eq(f.input_value(),'incolor sr');eq(before,1)
@case('filtering without a sort change does not reinsert every catalog row')
def _(p):
 new(p);p.evaluate("window.__mutations=0;new MutationObserver(m=>__mutations+=m.filter(x=>x.type==='childList').length).observe(document.querySelector('[data-product-list]'),{childList:true})")
 p.locator('[data-filter-search]').fill('Incolor');p.wait_for_timeout(50);eq(p.evaluate('__mutations'),0)
@case('custom catalog build allowance can be undone without losing the prior amount')
def _(p):
 new(p);p.locator('[data-frameset-build-preset]').select_option('custom');f=p.locator('[data-frameset-build-allowance]');before=f.input_value();f.fill('');f.type('10000');p.evaluate('__back()');eq(f.input_value(),before)
@case('comparison query deduplicates items rather than comparing a bike to itself')
def _(p):
 new(p,'/?compare=af01-frameset,af01-frameset');eq(p.locator('[data-compare-count]').inner_text(),'1');assert p.locator('[data-inline-compare]').is_hidden()
@case('model page uses the existing ten-item comparison limit, not four')
def _(p):
 home=BeautifulSoup((SITE/'index.html').read_text(),'html.parser');data=json.loads(home.select_one('#catalog-data').string);ids=[x['id'] for x in data if x['id']!='af01-frameset'][:5]
 target='/?compare='+','.join(ids);new(p,'/models/af01-frameset/?'+urlencode({'from':target}),blocked=True)
 assert p.locator('[data-add-to-comparison]').is_enabled();p.locator('[data-add-to-comparison]').click();assert 'af01-frameset' in p.locator('[data-model-compare-link]').get_attribute('href')

@case('history without a comparison clears later selections and Forward restores them')
def _(p):
 new(p)
 ids=p.locator('[data-compare-id]').evaluate_all('(xs)=>xs.slice(0,2).map(x=>x.dataset.compareId)')
 p.evaluate('(ids)=>{__history.pushState(null,"","?compare="+ids.join(","));dispatchEvent(new PopStateEvent("popstate"))}',ids)
 eq(p.locator('[data-compare-count]').text_content(),'2')
 p.evaluate('__back()');eq(p.locator('[data-compare-count]').text_content(),'0');assert p.locator('[data-inline-compare]').is_hidden()
 p.evaluate('__forward()');eq(p.locator('[data-compare-count]').text_content(),'2');assert p.locator('[data-inline-compare]').is_visible()
@case('direct model prices ignore an unrelated stored build allowance')
def _(p):
 new(p,'/models/af01-frameset/',stored={'china-bike-guide-build-allowance-v1':'99000'})
 label=p.locator('[data-model-calculated-price]').inner_text();assert '13,385' in label,label
@case('comparison model links retain the current build allowance')
def _(p):
 new(p,'/?build=12345&compare=af01-frameset,lightcarbon-lcg073-d-frameset')
 # Use two IDs actually present in the catalog, rather than assuming a second model.
 ids=p.locator('[data-compare-id]').evaluate_all('(xs)=>xs.slice(0,2).map(x=>x.dataset.compareId)')
 p.evaluate('(ids)=>{__url.search="?build=12345&compare="+ids.join(",");dispatchEvent(new PopStateEvent("popstate"))}',ids)
 href=p.locator('[data-compare-content] .compare-product-head a').first.get_attribute('href');assert 'build=12345' in href,href
@case('shared build does not inherit private stored parts or custom values')
def _(p):
 stored={'china-bike-builder-v2':json.dumps({'baseId':'af01-frameset','selections':{'drivetrain':'custom'},'custom':{'drivetrain':{'price':'9999'}},'baseCustom':{'packageWeight':'500'}})}
 new(p,'/build/?base=af01-frameset',stored=stored);eq(slot(p,'drivetrain').input_value(),'shimano-105-r7170-large-package');eq(p.locator('[data-build-package-weight]').input_value(),'')
@case('bare planner resumes a local draft but explicit URL wins')
def _(p):
 new(p,'/build/',stored={'china-bike-builder-v2':json.dumps({'baseId':'camp-gx600-pes','selections':{'wheelset':'custom'},'custom':{},'baseCustom':{}})})
 eq(p.locator('[data-build-base]').input_value(),'camp-gx600-pes');eq(slot(p,'wheelset').input_value(),'custom')
@case('builder Back and Forward restore component selections')
def _(p):
 new(p,'/build/?base=af01-frameset');slot(p,'wheelset').select_option('custom');slot(p,'tires').select_option('custom');p.evaluate('__back()');eq(slot(p,'tires').input_value(),'continental-gp5000-str-700x35-pair');p.evaluate('__forward()');eq(slot(p,'tires').input_value(),'custom')
@case('fork/package remainder is explicit, persisted in URL, and undoable')
def _(p):
 new(p,'/build/?base=af01-frameset');before=p.locator('[data-build-total-weight]').inner_text();p.locator('[data-build-package-weight]').fill('650');assert 'packageWeight=650' in p.evaluate('__url.href');after=p.locator('[data-build-total-weight]').inner_text();assert after!=before;(p.evaluate('__back()'));eq(p.locator('[data-build-package-weight]').input_value(),'')
@case('known base price and weight fields stay hidden while package remainder is editable')
def _(p):
 new(p,'/build/?base=af01-frameset');assert p.locator('[data-build-base-price-field]').is_hidden();assert p.locator('[data-build-base-weight-field]').is_hidden();assert p.locator('[data-build-package-weight]').is_visible()
@case('buyer-confirmed base-package part is not charged or weighed twice')
def _(p):
 new(p,'/build/?base=af01-frameset&part-cockpit=in-base&packageWeight=900');eq(slot(p,'cockpit').input_value(),'in-base');eq(field(p,'cockpit','part-price').inner_text(),'In base price');assert field(p,'cockpit','custom-values').is_hidden()
@case('complete-bike upgrade adds new cost and uses a removed/new weight delta')
def _(p):
 new(p,'/build/?base=camp-gx600-pes&part-wheelset=custom&price-wheelset=500&weight-wheelset=1000&removed-wheelset=1500')
 eq(p.locator('[data-build-total-price]').inner_text(),'¥6,188');eq(p.locator('[data-build-total-weight]').inner_text(),'8.60 kg')
@case('impossible removed weight is not presented as a negative final bike weight')
def _(p):
 new(p,'/build/?base=camp-gx600-pes&part-wheelset=custom&price-wheelset=500&weight-wheelset=1000&removed-wheelset=15000')
 eq(p.locator('[data-build-total-weight]').inner_text(),'Check removed-part weights');assert 'Removed parts exceed' in p.locator('[data-build-completeness]').inner_text()
@case('switching the base bike clears base-specific removed component weights')
def _(p):
 new(p,'/build/?base=camp-gx600-pes&part-wheelset=custom&price-wheelset=500&weight-wheelset=1000&removed-wheelset=1500');p.locator('[data-build-base]').select_option('camp-gx700-grx820');eq(field(p,'wheelset','removed-weight').input_value(),'');assert 'unknown' in p.locator('[data-build-total-weight]').inner_text()
@case('2x clearance uses the recorded smaller limit, not the 1x claim')
def _(p):
 new(p,'/build/?base=incolor-speedster-sr-frameset');text=p.locator('[data-build-compatibility]').inner_text();assert '35 mm tires exceed' in text and '32 mm limit for 2×' in text,text
@case('unknown drivetrain clearance remains a warning, not proof of fit')
def _(p):
 new(p,'/build/?base=incolor-speedster-sr-frameset&part-drivetrain=custom');text=p.locator('[data-build-compatibility]').inner_text();assert 'not proof of fit' in text,text
@case('bundled drivetrain covers components exactly once')
def _(p):
 new(p,'/build/?base=camp-gx600-pes&part-drivetrain=shimano-105-r7170-large-package');eq(p.locator('[data-build-total-price]').inner_text(),'¥9,838');assert slot(p,'brakes').is_disabled();assert 'not counted again' in field(p,'brakes','covered-note').inner_text()
@case('builder copy uses the fallback and announces the outcome')
def _(p):
 new(p,'/build/?base=af01-frameset');p.evaluate("document.execCommand=()=>true;Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(Error('denied'))},configurable:true})")
 p.locator('[data-build-copy]').click();eq(p.locator('#copy-status').inner_text(),'Build link copied.');assert p.locator('[data-build-copy]').evaluate('(x)=>document.activeElement===x')
@case('failed hero keeps working gallery controls; a new view can recover')
def _(p):
 new(p,'/models/quick-gr-one-frameset/',images=True);eq(p.locator('[data-gallery-hero]').count(),1);assert p.locator('[data-gallery-thumb]').nth(1).is_visible();p.locator('[data-gallery-thumb]').nth(1).click();p.wait_for_function("document.querySelector('[data-gallery-hero]').naturalWidth>0");p.locator('[data-gallery-hero]').wait_for(state='visible',timeout=3000)
@case('one failed thumbnail does not remove the working hero')
def _(p):
 new(p,'/models/quick-gr-one-frameset/',images=True);p.locator('[data-gallery-thumb]').nth(1).click();p.wait_for_function("document.querySelector('[data-gallery-hero]').naturalWidth>0");p.locator('[data-gallery-thumb]').nth(0).locator('img').evaluate("x=>x.dispatchEvent(new Event('error'))");p.locator('[data-gallery-hero]').wait_for(state='visible',timeout=3000);assert p.locator('[data-gallery-thumb]').nth(0).is_hidden()
@case('gallery removes stale srcset and rapid selections finish on the last view')
def _(p):
 new(p,'/models/quick-gr-one-frameset/',images=True);p.evaluate("const h=document.querySelector('[data-gallery-hero]');h.srcset='data:image/png;base64,INVALID 2x';h.sizes='100vw';const b=document.querySelectorAll('[data-gallery-thumb]');b[1].click();b[2].click();b[3].click();")
 p.wait_for_timeout(150);eq(p.locator('[data-gallery-hero]').get_attribute('src'),p.locator('[data-gallery-thumb]').nth(3).get_attribute('data-gallery-src'));eq(p.locator('[data-gallery-hero]').get_attribute('srcset'),None);eq(p.locator('[data-gallery-hero]').get_attribute('sizes'),None)
@case('gallery keyboard navigation skips hidden views')
def _(p):
 new(p,'/models/quick-gr-one-frameset/',images=True);p.locator('[data-gallery-thumb]').nth(1).evaluate('x=>x.hidden=true');p.locator('[data-gallery-thumb]').nth(0).focus();p.keyboard.press('ArrowRight');assert p.locator('[data-gallery-thumb]').nth(2).evaluate('x=>x===document.activeElement')
@case('mobile navigation closes on Escape and restores button focus')
def _(p):
 p.set_viewport_size({'width':390,'height':844});new(p);p.locator('.menu-button').click();eq(p.locator('.menu-button').get_attribute('aria-expanded'),'true');p.keyboard.press('Escape');eq(p.locator('.menu-button').get_attribute('aria-expanded'),'false');assert p.locator('.menu-button').evaluate('x=>x===document.activeElement')
@case('mobile catalog and builder fit the viewport without page-wide horizontal scrolling')
def _(p):
 p.set_viewport_size({'width':390,'height':844});new(p);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1');p.screenshot(path=str(REPORTS/'screenshots/catalog-mobile.png'));p.close()
 q=browser.new_page(viewport={'width':390,'height':844});load(q,'/build/?base=af01-frameset');assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+1');eq(q.evaluate('__errors'),[]);q.close()

with sync_playwright() as p:
 browser=p.chromium.connect_over_cdp(args.cdp) if args.cdp else p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'] if hasattr(os,'geteuid') and os.geteuid()==0 else [])
 if args.cdp and not browser.contexts[0].pages:
  browser.contexts[0].new_page() # Keep the shared research browser open between isolated cases.
 for name,fn in checks:
  if args.case and args.case not in name: continue
  page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(5000);started=time.monotonic()
  try:
   fn(page)
   if not page.is_closed():eq(page.evaluate('__errors'),[])
   results.append({'name':name,'status':'passed','seconds':round(time.monotonic()-started,3)});print('PASS',name,flush=True)
  except Exception as e:
   if not page.is_closed(): print('PAGE ERRORS',page.evaluate('window.__errors ?? []'),flush=True)
   results.append({'name':name,'status':'failed','error':str(e),'trace':traceback.format_exc()});print('FAIL',name,str(e),flush=True)
  finally:
   if not page.is_closed():page.close()
 for name,path,width,height in [('catalog-desktop','/',1440,1000),('builder-desktop','/build/?base=af01-frameset',1440,1000),('builder-mobile','/build/?base=af01-frameset',390,844),('catalog-dark','/',1440,1000)]:
  if args.case: continue
  page=browser.new_page(viewport={'width':width,'height':height});load(page,path)
  if name=='catalog-dark':
   page.locator('[data-theme-control]').click();page.locator('[data-theme-control]').click()
   page.wait_for_function("getComputedStyle(document.body).backgroundColor === 'rgb(17, 21, 18)' && getComputedStyle(document.body).color === 'rgb(238, 242, 238)'")
  page.screenshot(path=str(REPORTS/'screenshots'/f'{name}.png'));page.close()
 if not args.cdp: browser.close()
report={'mode':'Offline Chromium DOM regression tests against the real deployed HTML and modified JavaScript. Navigation, storage and gallery image fetches use explicit fixtures; network navigation is administratively blocked.','passed':sum(x['status']=='passed' for x in results),'failed':sum(x['status']=='failed' for x in results),'tests':results}
(REPORTS/'browser-results.json').write_text(json.dumps(report,indent=2));print(report['passed'],'passed;',report['failed'],'failed')
raise SystemExit(bool(report['failed']))
