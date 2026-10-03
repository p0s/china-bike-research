"""Browser regressions against the generated site; external requests are blocked."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--reports', type=Path, required=True)
args = parser.parse_args()
args.reports.mkdir(parents=True, exist_ok=True)
base = json.loads((ROOT / 'dist/build-manifest.json').read_text())['base']
server = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT,
    env={**os.environ, 'PORT':'0'}, stdout=subprocess.PIPE, text=True)
results = []
try:
    origin = server.stdout.readline().strip().removeprefix('Preview: ')
    assert origin.startswith('http://127.0.0.1:')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
        try:
            for locale in ['', '/zh', '/de']:
                for width in [1440, 390, 320]:
                    context = browser.new_context(viewport={'width':width, 'height':1000})
                    context.route('**/*', lambda route: route.continue_()
                        if route.request.url.startswith(origin + '/') else route.abort())
                    page = context.new_page()
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    path = origin + base + locale + '/build/'
                    page.goto(path + '?base=candidate-java-lampo-carbon-road', wait_until='networkidle')
                    warning = page.locator('[data-build-starting-point-warning]')
                    def unresolved():
                        expect(warning).to_be_visible()
                        expect(page.locator('[data-build-base]')).to_have_value('')
                        expect(page.locator('[data-build-total-price]')).to_have_text('—')
                        expect(page.locator('[data-build-total-weight]')).to_have_text('—')
                        expect(page.locator('[data-build-base-facts]')).to_contain_text('candidate-java-lampo-carbon-road')
                        expect(page).to_have_url(re.compile(r'base=candidate-java-lampo-carbon-road'))
                    unresolved()
                    page.locator('[data-build-slot="wheelset"] [data-build-part-select]').select_option('custom')
                    unresolved()
                    draft = page.evaluate("JSON.parse(localStorage.getItem('china-bike-builder-v2'))")
                    assert draft['requestedBaseId'] == 'candidate-java-lampo-carbon-road'
                    assert draft['unavailableStartingPoint'] is True
                    page.reload(wait_until='networkidle')
                    unresolved()
                    shared = context.new_page()
                    shared.goto(page.url, wait_until='networkidle')
                    expect(shared.locator('[data-build-starting-point-warning]')).to_be_visible()
                    expect(shared.locator('[data-build-total-price]')).to_have_text('—')
                    shared.close()
                    page.goto(path, wait_until='networkidle')
                    unresolved()
                    expect(page.locator('[data-build-copy]')).to_be_visible()
                    expect(page.locator('[data-build-reset]')).to_be_visible()
                    expect(page.locator('[data-build-completeness]')).to_be_visible()
                    page.locator('[data-build-reset]').click()
                    unresolved()
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                    page.screenshot(path=str(args.reports / f'{locale.strip("/") or "en"}-{width}.png'))
                    page.locator('[data-build-base]').select_option('af01-frameset')
                    expect(warning).to_be_hidden()
                    expect(page).to_have_url(re.compile(r'base=af01-frameset'))
                    assert page.locator('[data-build-total-price]').inner_text() != '—'
                    page.go_back()
                    unresolved()
                    page.go_forward()
                    expect(warning).to_be_hidden()
                    assert not errors, errors
                    results.append({'locale':locale or 'en', 'width':width, 'passed':True})
                    context.close()
        finally:
            browser.close()
    (args.reports / 'results.json').write_text(json.dumps(results, indent=2))
finally:
    server.terminate()
    server.wait(timeout=10)
