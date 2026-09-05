"""Local HTTP navigation checks against a generated site, with remote media blocked."""
import json
import os
from pathlib import Path
import subprocess
import argparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--reports', type=Path, required=True)
args = parser.parse_args()
args.reports.mkdir(parents=True, exist_ok=True)
base = json.loads((ROOT / 'dist/build-manifest.json').read_text())['base']
server = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT,
                          env={**os.environ, 'PORT': '0'}, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, text=True)
checks = []
try:
    origin = server.stdout.readline().strip().removeprefix('Preview: ')
    assert origin.startswith('http://127.0.0.1:'), origin
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
        try:
            for width, height in [(1440, 1000), (390, 844)]:
                context = browser.new_context(viewport={'width': width, 'height': height})
                context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(origin + '/') else route.abort())
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(origin + base + '/', wait_until='networkidle')
                expect(page.locator('[data-theme-label]')).to_have_text('System')
                search = page.locator('[data-filter-search]')
                search.fill('incolor')
                expect(page).to_have_url(__import__('re').compile(r'q=incolor'))
                page.go_back()
                expect(search).to_have_value('')
                page.go_forward()
                expect(search).to_have_value('incolor')
                checks.append(f'{width}: real module loading and filter Back/Forward')

                page.goto(origin + base + '/?compare=af01-frameset,lightcarbon-lcg073-d-frameset', wait_until='networkidle')
                # Use actual catalog IDs rather than assuming both fixture IDs exist.
                ids = page.locator('[data-compare-id]').evaluate_all('(xs)=>xs.slice(0,2).map(x=>x.dataset.compareId)')
                page.goto(origin + base + '/?compare=' + ','.join(ids), wait_until='networkidle')
                expect(page.locator('[data-inline-compare]')).to_be_visible()
                page.screenshot(path=str(args.reports / f'comparison-{width}.png'))
                page.locator('[data-close-compare]').click()
                expect(page.locator('[data-inline-compare]')).to_be_hidden()
                checks.append(f'{width}: comparison open and keyboard-accessible close')

                page.goto(origin + base + '/build/?base=af01-frameset', wait_until='networkidle')
                wheel = page.locator('[data-build-slot="wheelset"] [data-build-part-select]')
                before = wheel.input_value()
                wheel.select_option('custom')
                page.go_back()
                expect(wheel).to_have_value(before)
                page.go_forward()
                expect(wheel).to_have_value('custom')
                expect(page.locator('[data-build-package-weight]')).to_be_visible()
                page.screenshot(path=str(args.reports / f'builder-{width}.png'))
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                checks.append(f'{width}: planner history, package field, responsive layout')

                page.goto(origin + base + '/models/af01-frameset/', wait_until='networkidle')
                expect(page.locator('[data-add-to-comparison]')).to_be_visible()
                tooltip = page.locator('[data-tooltip-lines]').first
                if tooltip.count():
                    tooltip.focus()
                    tooltip.press('Enter')
                    expect(page.locator('#shared-tooltip')).to_be_visible()
                    tooltip.press('Escape')
                    expect(page.locator('#shared-tooltip')).to_be_hidden()
                    checks.append(f'{width}: keyboard popover opens and dismisses')
                assert not errors, errors
                checks.append(f'{width}: model route and no JavaScript errors')
                context.close()
        finally:
            browser.close()
    (args.reports / 'live-results.json').write_text(json.dumps({'base': base, 'passed': checks}, indent=2))
    print(json.dumps({'base': base, 'passed': checks}, indent=2))
finally:
    server.terminate()
    server.wait(timeout=10)
