"""Optional real Chromium regression: generated files only; no external requests.
Requires Playwright. Example: python tests/model-layout-browser.py --site dist.
"""
import argparse, json, mimetypes
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--site', type=Path, default=Path('dist'))
parser.add_argument('--reports', type=Path, default=Path('.research/model-layout'))
parser.add_argument('--browser', help='Optional Chromium executable')
args = parser.parse_args()
args.reports.mkdir(parents=True, exist_ok=True)
models = ['lightcarbon-lcr018-d', 'lightcarbon-lcg071s-pro-frameset', 'yoeleo-altera-g21-frameset', 'lightcarbon-speedz-frameset', 'pardus-robin-sport-pes']
results = []

def check_native_anchors(page, route):
    page.keyboard.press('Tab')
    assert page.evaluate("document.activeElement.matches('.skip-link')"), 'skip link is first keyboard stop'
    page.keyboard.press('Enter')
    page.keyboard.press('Tab')
    assert page.evaluate("document.querySelector('#content').contains(document.activeElement)"), 'skip continues into main content'
    # A normal section target with an intervening keyboard stop catches the
    # same regression independently of the site's skip link.
    page.evaluate('''() => {
      const main=document.querySelector('#content');
      const link=document.createElement('a');link.id='qa-section-link';link.href='#qa-section-target';link.textContent='Section';
      const section=document.createElement('section');section.id='qa-section-target';
      const button=document.createElement('button');button.id='qa-section-next';button.textContent='Section control';section.append(button);
      main.prepend(link);main.append(section);
    }''')
    for _ in range(2):
        page.locator('#qa-section-link').focus()
        page.keyboard.press('Enter')
        page.keyboard.press('Tab')
        assert page.evaluate("document.activeElement.id==='qa-section-next'"), 'ordinary section navigation moves the next keyboard stop'
    page.evaluate('''route => {
      document.querySelector('#qa-section-link').remove();document.querySelector('#qa-section-target').remove();
      history.replaceState(history.state,'',route);document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'});
    }''', route)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, **({'executable_path': args.browser} if args.browser else {}))
    context = browser.new_context(device_scale_factor=1)
    def serve(route):
        parsed = urlsplit(route.request.url)
        if parsed.hostname != 'preview.invalid': return route.abort()
        file = args.site / parsed.path.lstrip('/')
        if file.is_dir(): file = file / 'index.html'
        if file.is_file(): route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
        else: route.abort()
    context.route('**/*', serve)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for lang, prefix in [('en', ''), ('zh', '/zh'), ('de', '/de')]:
        for model in models:
            for width in [1440, 320, 375, 390, 768]:
                name = f'{lang}-{model}-{width}'
                page.close()
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
                route = f'https://preview.invalid{prefix}/models/{model}/'
                page.goto(route, wait_until='load')
                if page.locator('[data-gallery-hero]').count():
                    page.wait_for_function("document.querySelector('[data-gallery-hero]').complete && document.querySelector('[data-gallery-hero]').naturalWidth>0")
                page.wait_for_function("!document.querySelector('#source-records').open")
                check_native_anchors(page, route)
                state = page.evaluate('''() => {
                  const h=document.querySelector('h1'), g=document.querySelector('.model-gallery');
                  const caption=g?.querySelector('figcaption'), rail=g?.querySelector('.model-gallery-strip');
                  return {overflow:document.documentElement.scrollWidth>innerWidth,titleY:h.getBoundingClientRect().top,
                    titleFirst:!g||!!(h.compareDocumentPosition(g)&Node.DOCUMENT_POSITION_FOLLOWING),
                    titleAbove:!g||h.getBoundingClientRect().bottom<g.getBoundingClientRect().top,
                    galleryY:g?.getBoundingClientRect().top,galleryHeight:g?.getBoundingClientRect().height,
                    captionBeforeRail:!rail||caption.getBoundingClientRect().bottom<=rail.getBoundingClientRect().top,
                    railHeight:rail?.getBoundingClientRect().height,thumbs:g?.querySelectorAll('[data-gallery-thumb]').length??0};
                }''')
                assert not state['overflow'] and state['titleFirst'] and state['titleAbove'], (name, state)
                assert state['captionBeforeRail'] and (state['railHeight'] or 0) < 100, (name, state)
                page.screenshot(path=str(args.reports / f'{name}.png'))
                hero = page.locator('[data-gallery-hero]')
                if hero.count():
                    assert hero.evaluate('el => el.getBoundingClientRect().bottom <= el.parentElement.getBoundingClientRect().bottom'), 'image must stay inside its container'
                    hero.hover()
                    assert hero.evaluate('el => el.getBoundingClientRect().bottom <= el.parentElement.getBoundingClientRect().bottom'), 'hover must not cover the caption'
                else:
                    assert page.locator('.model-grid.has-no-image').count() == 1
                    assert page.locator('.model-gallery').count() == 0
                thumbs = page.locator('[data-gallery-thumb]')
                count = thumbs.count()
                if count:
                    for index in dict.fromkeys([0, count // 2, count - 1]):
                        thumb = thumbs.nth(index)
                        thumb.focus(); thumb.press('Space')
                        page.wait_for_function("document.querySelector('[data-gallery-hero]').naturalWidth > 0")
                        assert thumb.get_attribute('aria-pressed') == 'true'
                        assert page.locator('[data-gallery-thumb][aria-pressed="true"]').count() == 1
                        assert page.locator('span[data-gallery-caption]').text_content() == thumb.get_attribute('data-gallery-caption')
                        note = page.locator('[data-gallery-note-text]')
                        assert note.text_content() == thumb.get_attribute('data-gallery-note')
                        assert note.is_visible() == bool(thumb.get_attribute('data-gallery-note'))
                        assert page.locator('[data-gallery-hero]').get_attribute('src') == thumb.get_attribute('data-gallery-src')
                        source = thumb.get_attribute('data-gallery-source')
                        if source: assert page.locator('[data-gallery-source-link]').get_attribute('href') == source
                        assert thumb.evaluate('(el)=>el===document.activeElement')
                    thumbs.first.focus(); thumbs.first.press('End')
                    assert thumbs.last.get_attribute('aria-pressed') == 'true'
                    thumbs.last.press('Home')
                    assert thumbs.first.get_attribute('aria-pressed') == 'true'
                    thumbs.first.press('ArrowRight')
                    assert thumbs.nth(1).get_attribute('aria-pressed') == 'true'
                    summary = page.locator('[data-gallery-all] > summary')
                    summary.focus(); summary.press('Enter')
                    assert page.locator('[data-gallery-all]').evaluate('(el)=>el.open')
                    assert page.locator('.gallery-all-images > li').count() == count
                    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
                    summary.press('Enter')
                tables = page.locator('.geometry-scroll')
                for index in range(tables.count()):
                    table = tables.nth(index)
                    table.focus()
                    assert table.get_attribute('aria-labelledby')
                    assert table.locator('th[scope="row"]').count() > 0
                    assert table.locator('thead th[scope="col"]').count() > 2
                    if table.evaluate('(el)=>el.scrollWidth>el.clientWidth'):
                        table.press('ArrowRight')
                        page.wait_for_function('(el)=>el.scrollLeft>0', arg=table.element_handle())
                    if width in [1440, 375]:
                        page.wait_for_timeout(200)
                        table.evaluate('(el)=>el.scrollLeft=0')
                        table.evaluate('(el)=>el.closest("section").querySelector("h2").scrollIntoView({block:"start",behavior:"instant"})')
                        page.screenshot(path=str(args.reports / f'{name}-geometry-{index}.png'))
                if model == 'lightcarbon-lcr018-d':
                    assert page.locator('.geometry-table tbody tr').count() == 18
                    assert page.locator('.geometry-table').get_by_text('1006.3 +mm', exact=True).count() == 1
                if model == 'pardus-robin-sport-pes':
                    warning = {'en': 'Manufacturer geometry conflict', 'zh': '制造商几何冲突', 'de': 'Widerspruch in der Herstellergeometrie'}[lang]
                    assert page.locator('p.geometry-evidence-warning').filter(has_text=warning).is_visible()
                    assert page.locator('.geometry-table tbody tr').count() == 20
                    assert page.locator('.geometry-table tbody tr').filter(has_text='Wheelbase').locator('td').all_text_contents() == ['974','981','986','1000','1014','1035']
                source_panel = page.locator('#source-records')
                assert not source_panel.evaluate('(el)=>el.open')
                page.locator('a[href="#source-records"]').evaluate('(el)=>el.scrollIntoView({block:"center",behavior:"instant"})')
                page.locator('a[href="#source-records"]').click()
                assert source_panel.evaluate('(el)=>el.open')
                page.wait_for_function('''()=>document.querySelector('#source-records').getBoundingClientRect().top >= document.querySelector('.site-header').getBoundingClientRect().bottom''')
                source_panel.locator('summary').click()
                page.locator('a[href="#source-records"]').evaluate('(el)=>el.scrollIntoView({block:"center",behavior:"instant"})')
                page.locator('a[href="#source-records"]').click()
                assert source_panel.evaluate('(el)=>el.open'), 'same-fragment navigation'
                page.reload(wait_until='load')
                page.wait_for_function("document.querySelector('#source-records').open")
                assert source_panel.evaluate('(el)=>el.open'), 'initial fragment navigation'
                assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
                results.append({'name': name, 'status': 'passed', **state})
                print('PASS', name, flush=True)
    # Replace responsive sources too, so the fixture exercises actual failures.
    for prefix, unavailable in [('', 'Source image unavailable'), ('/zh', '来源图片不可用'), ('/de', 'Quellbild nicht verfügbar')]:
        page.goto(f'https://preview.invalid{prefix}/models/lightcarbon-lcr018-d/', wait_until='load')
        page.locator('[data-gallery-hero]').evaluate("el=>{el.removeAttribute('srcset');el.removeAttribute('sizes');el.src='/missing.webp'}")
        page.wait_for_function("document.querySelector('[data-gallery-hero]').hidden")
        assert page.locator('span[data-gallery-caption]').is_visible()
        assert unavailable in page.locator('span[data-gallery-caption]').text_content()
        page.locator('[data-gallery-thumb]').nth(2).click()
        page.wait_for_function("!document.querySelector('[data-gallery-hero]').hidden && document.querySelector('[data-gallery-hero]').naturalWidth>0")
        page.locator('[data-gallery-thumb] img').first.evaluate("el=>{el.removeAttribute('srcset');el.removeAttribute('sizes');el.src='/missing-thumb.webp'}")
        page.wait_for_function("document.querySelector('[data-gallery-thumb]').hidden")
        page.locator('[data-gallery-thumb]').nth(2).focus()
        page.keyboard.press('Home')
        assert page.locator('[data-gallery-thumb]').nth(1).get_attribute('aria-pressed') == 'true'
    assert not errors, errors
    nojs = browser.new_context(java_script_enabled=False, viewport={'width':320,'height':844})
    nojs.route('**/*', serve)
    static = nojs.new_page()
    for prefix in ['', '/zh', '/de']:
        for model in models:
            static.goto(f'https://preview.invalid{prefix}/models/{model}/', wait_until='load')
            assert static.locator('#source-records').evaluate('(el)=>el.open')
            disclosure = static.locator('[data-gallery-all]')
            if disclosure.count():
                disclosure.locator('summary').click()
                assert disclosure.evaluate('(el)=>el.open')
                assert static.locator('.gallery-all-images > li').count() == max(1, static.locator('[data-gallery-thumb]').count())
            assert not static.evaluate('document.documentElement.scrollWidth>innerWidth')
    browser.close()
(args.reports / 'measurements.json').write_text(json.dumps(results, indent=2))
print('PASS: 75 viewport/locale routes with native skip/section keyboard navigation, 15 no-JS routes, and image failure recovery.')
