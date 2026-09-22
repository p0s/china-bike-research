"""Local generated-site checks using an isolated browser; optional exact blog photo requests.
Requires the existing optional Playwright development environment and Chromium.
"""
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
import argparse, json, mimetypes, os, shutil, re, base64
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--site', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
parser.add_argument('--base', default='')
parser.add_argument('--case', default='')
parser.add_argument('--live-blog-images', action='store_true')
parser.add_argument('--reports', type=Path, default=Path(__file__).resolve().parents[1] / '.research/seo-browser')
args = parser.parse_args()
SITE, BASE, REPORTS = args.site.resolve(), args.base.rstrip('/'), args.reports
REPORTS.mkdir(parents=True, exist_ok=True)
ORIGIN = 'https://preview.invalid'
results = []
REPO = Path(__file__).resolve().parents[1]
photo_ids = {photo['image_id'] for photo in json.loads((REPO/'content/blog-images.json').read_text())['model_photos']}
photo_urls = {image['hosting']['remote_url'] for image in (json.loads(file.read_text()) for file in (REPO/'data/images').glob('*.json')) if image['id'] in photo_ids}

def load(page, path, script=True):
    pathname = urlsplit(path).path
    relative = pathname[len(BASE):] if BASE and pathname.startswith(BASE + '/') else pathname
    target = SITE / relative.lstrip('/')
    if target.is_dir(): target = target / 'index.html'
    soup = BeautifulSoup(target.read_text(), 'html.parser')
    for tag in soup.find_all('script'):
        if tag.get('type') not in ('application/json', 'application/ld+json'): tag.decompose()
    for tag in soup.select('link[rel="stylesheet"]'): tag.decompose()
    style = soup.new_tag('style'); style.string = (SITE/'assets/site.css').read_text(); soup.head.append(style)
    for image in soup.select('img'):
        image.attrs.pop('srcset', None)
        src = image.get('src', '')
        media_path = urlsplit(src).path
        if BASE and media_path.startswith(BASE + '/'): media_path = media_path[len(BASE):]
        local = SITE / media_path.lstrip('/')
        if not src.startswith(('https:', 'http:')) and local.is_file():
            image['src'] = 'data:' + str(mimetypes.guess_type(str(local))[0]) + ';base64,' + base64.b64encode(local.read_bytes()).decode()
        elif not (args.live_blog_images and image.has_attr('data-blog-bike-image') and src in photo_urls):
            image['src'] = 'data:image/png;base64,INVALID'
    page.set_content(str(soup), wait_until='domcontentloaded')
    if not script: return
    page.evaluate("""url => {
        window.__url=new URL(url);window.__store=new Map();
        window.__storage={getItem:k=>__store.get(k)??null,setItem:(k,v)=>__store.set(k,String(v))};
        window.__history={pushState:(a,b,u)=>{__url.href=new URL(u,__url).href},replaceState:(a,b,u)=>{__url.href=new URL(u,__url).href}};
    }""", ORIGIN + path)
    site=(SITE/'assets/site.js').read_text()
    modules=re.findall(r"from './([^']+)';",site)
    module_code='\n'.join((SITE/'assets'/m).read_text().replace('export ','') for m in dict.fromkeys(modules))
    site=re.sub(r'^import [^;]+;\n','',site,flags=re.M)
    page.add_script_tag(content='{ const location=window.__url, history=window.__history, localStorage=window.__storage;\n'+module_code+'\n'+site+'\n}')
    page.wait_for_timeout(150)

def record(name, fn):
    if args.case and args.case not in name: return
    try:
        fn(); results.append({'name':name, 'status':'passed'}); print('PASS', name, flush=True)
    except Exception as error:
        results.append({'name':name, 'status':'failed', 'error':str(error)}); print('FAIL', name, error, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('google-chrome'), args=['--no-sandbox'])
    ctx = browser.new_context()
    ctx.route('**/*', lambda route: route.continue_() if args.live_blog_images and route.request.url in photo_urls else route.abort())
    page = ctx.new_page()
    page.set_default_timeout(6000)
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    def go(path):
        load(page, BASE + path)
    for locale in ('en', 'zh-Hans'):
        prefix = '/zh' if locale == 'zh-Hans' else ''
        for width, height, mode in [(1440,1000,'desktop'),(390,844,'mobile')]:
            for route in ['/blog/'] + ['/blog/'+post['slug']+'/' for post in (json.loads(file.read_text()) for file in sorted((Path(__file__).resolve().parents[1]/'content/posts').glob('*.json')))] + ['/']:
                def visual(route=route,width=width,height=height,mode=mode,locale=locale,prefix=prefix):
                    page.set_viewport_size({'width':width,'height':height})
                    go(prefix+route)
                    assert page.locator('html').get_attribute('lang') == locale
                    assert page.locator('h1').count() == 1
                    overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
                    assert not overflow, 'Document overflow; the table must scroll inside its own wrapper'
                    if route != '/':
                        assert page.locator('main a[href*="/blog/"]').count() >= 1
                        images = page.locator('[data-blog-mascot]')
                        photos = page.locator('[data-blog-bike-image]')
                        headers = page.locator('[data-blog-header-image]')
                        assert headers.count() == (5 if route == '/blog/' else 1)
                        headers.evaluate_all('(images)=>Promise.all(images.map(img=>{img.loading="eager";return img.decode()}))')
                        assert headers.evaluate_all('(images)=>images.every(img=>img.naturalWidth>0)')
                        expected = 0 if route == '/blog/' else 2 if 'gravel-bikes-around' in route else 3
                        assert images.count() == expected
                        assert photos.count() == expected
                        images.evaluate_all('(images)=>Promise.all(images.map(img=>{img.loading="eager";return img.decode()}))')
                        assert images.evaluate_all('(images)=>images.every(img=>img.naturalWidth>0)')
                        if args.live_blog_images:
                            photos.evaluate_all('(images)=>Promise.all(images.map(img=>{img.loading="eager";return img.decode()}))')
                            assert photos.evaluate_all('(images)=>images.every(img=>img.naturalWidth>0)')
                        assert page.locator('.article-card .section-label, .buyer-article header .section-label').count() == 0
                        image_name=f'{locale}-{mode}-{route.strip("/").replace("/","-")}.png'
                        page.evaluate('window.scrollTo(0,0); document.activeElement?.blur()')
                        page.screenshot(path=str(REPORTS/image_name), full_page=True)
                        if route != '/blog/':
                            page.locator('.blog-model-photos').screenshot(path=str(REPORTS/image_name.replace('.png','-models.png')))
                record(f'{locale} {mode} {route}',visual)
        def image_failure(prefix=prefix):
            go(prefix+'/blog/gravel-bikes-around-5000-yuan/')
            page.locator('[data-blog-header-image]').dispatch_event('error')
            assert page.locator('.article-cover').is_hidden()
            assert page.locator('.blog-model-photo figcaption').first.is_visible()
            page.locator('[data-blog-mascot]').first.dispatch_event('error')
            assert page.locator('[data-blog-mascot]').first.is_hidden()
            assert page.locator('.blog-model-photo figcaption').first.is_visible()
            page.locator('[data-blog-bike-image]').first.dispatch_event('error')
            assert page.locator('.blog-model-photo .blog-photo-scene').first.is_hidden()
            assert page.locator('.blog-model-photo [data-blog-photo-status]').first.is_visible()
            assert page.locator('h1').is_visible()
            assert page.locator('table tbody tr').count() == 3
            go(prefix+'/blog/')
            page.locator('.article-card img').first.dispatch_event('error')
            assert page.locator('.article-card-image').first.is_hidden()
            assert page.locator('.article-card h2 a').first.is_visible()
        record(f'{locale} /blog/ image failure preserves article and navigation', image_failure)
        def interaction(prefix=prefix,locale=locale):
            page.set_viewport_size({'width':1440,'height':1000});go(prefix+'/?q=incolor')
            search=page.locator('[data-filter-search]')
            search.fill('Twitter')
            assert 'Twitter' in page.evaluate('__url.href')
            visible=page.locator('[data-product-row]:visible')
            assert visible.count() > 0
            assert 'twitter' in visible.first.inner_text().lower()
            page.locator('[data-language-switch]').focus()
            target=page.locator('[data-language-switch]').get_attribute('href')
            assert 'Twitter' in target
            assert target.startswith(ORIGIN+BASE+('/zh/' if locale=='en' else '/'))
            load(page, urlsplit(target).path + ('?' + urlsplit(target).query if urlsplit(target).query else ''))
            assert page.locator('html').get_attribute('lang') != locale
            assert page.locator('[data-filter-search]').input_value() == 'Twitter'
        record(f'{locale} filters and language switch retain query',interaction)
        def compare(prefix=prefix,locale=locale):
            go(prefix+'/?compare=twitter-v3-wheeltop-eds%2Cpardus-super-sport-gen2-egr#compare')
            assert page.locator('[data-compare-count]').text_content() == '2', ('count',page.locator('[data-compare-count]').text_content())
            assert page.locator('[data-inline-compare]').is_visible(), 'comparison hidden'
            assert page.locator('[data-inline-compare] a[href*="models/"]').count() >= 2, ('links',page.locator('[data-inline-compare]').inner_html()[:1200])
            for href in page.locator('[data-inline-compare] a[href*="models/"]').evaluate_all('(links)=>links.map(a=>a.getAttribute("href"))'):
                assert href.startswith(BASE+prefix+'/models/'), href
        record(f'{locale} comparison loads deep link and localized model targets',compare)
        def builder(prefix=prefix,locale=locale):
            go(prefix+'/build/?base=af01-frameset')
            assert page.locator('[data-build-slot]').count() > 5
            assert page.locator('h1').inner_text() == ('配置自行车' if locale=='zh-Hans' else 'Configure a bike')
        record(f'{locale} builder initial state',builder)
    def no_errors(): assert errors == [], errors
    record('/blog/ no runtime JavaScript errors across inspected routes', no_errors)
    ctx.close()
    nojs=browser.new_context(java_script_enabled=False)
    nojs.route('**/*', lambda route: route.abort())
    static=nojs.new_page()
    def nojs_native():
        load(static, BASE+'/zh/blog/gravel-bikes-around-5000-yuan/', script=False)
        assert '左右' in static.locator('h1').inner_text()
        assert static.locator('table tbody tr').count() == 3
        assert static.locator('a[hreflang="en"]').count() == 1
        assert static.locator('main').inner_text().count('2026-08') >= 3
    record('/blog/ Chinese article, evidence and language link readable without JavaScript',nojs_native)
    nojs.close();browser.close()
report={'mode':'Isolated Chromium checks against generated HTML/CSS/JavaScript; URL, storage and history use fixtures', 'remote_images':'Only the seven manifest-selected blog images loaded live' if args.live_blog_images else 'All remote requests blocked', 'base':BASE, 'passed':sum(x['status']=='passed' for x in results), 'failed':sum(x['status']=='failed' for x in results),'tests':results}
(REPORTS/'browser-results.json').write_text(json.dumps(report,indent=2))
print(report['passed'],'passed;',report['failed'],'failed',flush=True)
raise SystemExit(bool(report['failed']))
