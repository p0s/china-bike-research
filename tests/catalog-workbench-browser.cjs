// Optional isolated Chromium regression against generated files; no external requests.
// NODE_PATH=/path/to/playwright/node_modules node tests/catalog-workbench-browser.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const site = path.resolve(process.env.WORKBENCH_SITE || 'dist');
const reports = path.resolve(process.env.WORKBENCH_REPORTS || '.research/catalog-workbench');
fs.mkdirSync(reports, { recursive: true });
const files = new Map();
const results = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.WORKBENCH_BROWSER ? { executablePath: process.env.WORKBENCH_BROWSER } : {}) });
  try {
    for (const locale of ['en', 'zh', 'de']) for (const width of [1440, 1024, 768, 390, 320]) for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: width > 1000 ? 900 : 844 }, colorScheme: theme });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== 'preview.invalid') return route.abort();
        let file = path.resolve(site, '.' + decodeURIComponent(url.pathname));
        if (!file.startsWith(site + path.sep) && file !== site) return route.abort();
        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
        if (!fs.existsSync(file)) return route.abort();
        if (!files.has(file)) files.set(file, fs.readFileSync(file));
        return route.fulfill({ body: files.get(file), contentType: mime[path.extname(file)] || 'application/octet-stream' });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const prefix = locale === 'en' ? '' : '/' + locale;
      const name = `${locale}-${width}-${theme}`;
      const open = async query => {
        await page.goto(`http://preview.invalid${prefix}/?${query}`, { waitUntil: 'load' });
        await page.waitForFunction(() => document.querySelector('[data-catalog-root]')?.dataset.activePriceCurrency);
      };
      try {
        await open('ship=CN&currency=CNY');
        await page.waitForFunction(() => [...document.querySelectorAll('[data-product-row]:not([hidden]) img')].filter(image => image.getBoundingClientRect().top < innerHeight).every(image => image.complete));
        const state = await page.evaluate(() => {
          const rows = [...document.querySelectorAll('[data-product-row]:not([hidden])')];
          return { overflow: document.documentElement.scrollWidth - innerWidth, first: rows[0]?.getBoundingClientRect().top,
            firstStage: rows[0]?.dataset.stage, visible: rows.filter(row => row.getBoundingClientRect().bottom <= innerHeight).length };
        });
        assert.ok(state.overflow <= 1, `${name}: document overflow ${state.overflow}`);
        assert.equal(state.firstStage, 'published', name);
        assert.ok(state.first < (width >= 960 ? 330 : 420), `${name}: first result starts at ${state.first}`);
        if (locale === 'en' && theme === 'light' && [1440, 390].includes(width)) await page.screenshot({ path: path.join(reports, `catalog-${width}.png`) });
        // General fuzzy search, relevance, filters and URL/history on desktop and phone.
        if (theme === 'light' && [1440, 390].includes(width)) {
          const foundIds = () => page.locator('[data-product-row]:not([hidden])').evaluateAll(rows => rows.map(row => row.dataset.id).sort());
          await open('ship=CN&currency=CNY&q=x-lab');
          const expected = await foundIds();
          assert.ok(expected.includes('candidate-xlab-rs9'));
          for (const query of ['xlab', 'xlabs', 'x lab', 'X–LAB', 'ＸＬＡＢＳ']) {
            await page.locator('#site-search').fill(query);
            await page.locator('#site-search').blur();
            assert.deepEqual(await foundIds(), expected, query);
            assert.equal(new URL(page.url()).searchParams.get('q'), query);
          }
          await page.locator('#site-search').fill('RS9 xlabs');
          await page.locator('#site-search').blur();
          assert.deepEqual(await foundIds(), ['candidate-xlab-rs9']);
          await page.reload({ waitUntil: 'load' });
          await page.waitForFunction(() => document.querySelector('[data-catalog-root]')?.dataset.activePriceCurrency);
          assert.deepEqual(await foundIds(), ['candidate-xlab-rs9']);
          await page.locator('#site-search').fill('RS8 xlabs');
          await page.locator('#site-search').blur();
          assert.deepEqual(await foundIds(), []);
          await page.goBack();
          await page.waitForFunction(() => document.querySelector('#site-search')?.value === 'RS9 xlabs');
          assert.deepEqual(await foundIds(), ['candidate-xlab-rs9']);
          await page.locator('[data-product-row]:not([hidden]) [data-model-link]').first().click();
          await page.locator('#site-search').fill('xlabs');
          await page.locator('#site-search').press('Enter');
          await page.waitForFunction(() => document.querySelector('[data-catalog-root]')?.dataset.activePriceCurrency);
          assert.equal(new URL(page.url()).pathname, `${prefix}/`);
          assert.deepEqual(await foundIds(), expected);
          if (width < 600) {
            const chips = await page.locator('[data-filter-chips]').boundingBox();
            const summary = await page.locator('[data-result-summary]').boundingBox();
            assert.ok(chips.y + chips.height <= summary.y + 1, 'search chips must not overlap the result count');
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          }
          if (locale === 'en') await page.screenshot({ path: path.join(reports, `search-${width}.png`) });
          await open('ship=CN&currency=CNY&q=xlabs&max=0&maxCurrency=CNY');
          assert.deepEqual(await foundIds(), [], 'search must still obey the budget filter');
          await open('ship=CN&currency=CNY&q=twittr');
          const twitterIds = await foundIds();
          assert.ok(twitterIds.includes('twitter-v3-wheeltop-eds'));
          assert.equal(await page.locator('[data-product-row]:not([hidden]) [data-search-close-match]:not([hidden])').count(), twitterIds.length);
          const labels = { en: ['Best match', 'Close match'], zh: ['最佳匹配', '近似匹配'], de: ['Beste Treffer', 'Ähnlicher Treffer'] }[locale];
          assert.equal(await page.locator('[data-sort] option:checked').textContent(), labels[0]);
          assert.equal(await page.locator('[data-search-close-match]:not([hidden])').first().textContent(), labels[1]);
          if (locale === 'en') await page.screenshot({ path: path.join(reports, `fuzzy-${width}.png`) });
          await page.reload({ waitUntil: 'load' });
          await page.waitForFunction(() => document.querySelector('[data-catalog-root]')?.dataset.activePriceCurrency);
          assert.deepEqual(await foundIds(), twitterIds);
          for (const [query, id] of [['shiamno', 'camp-gx700-grx820'], ['winspcae', 'winspace-g3-frameset'], ['velobulid', 'candidate-velobuild-cx-002-2023']]) {
            await page.locator('#site-search').fill(query);
            await page.locator('#site-search').blur();
            assert.ok((await foundIds()).includes(id), `${query}: ${id}`);
            assert.equal(new URL(page.url()).searchParams.get('q'), query);
          }
          // CAMP has direct and close matches; direct matches must all precede close ones.
          await page.locator('#site-search').fill('camp');
          await page.locator('#site-search').blur();
          const closeness = await page.locator('[data-product-row]:not([hidden])').evaluateAll(rows => rows.map(row => Boolean(row.querySelector('[data-search-close-match]:not([hidden])'))));
          assert.ok(closeness.includes(false) && closeness.includes(true));
          assert.deepEqual(closeness, [...closeness].sort());
          assert.ok(await page.locator('.catalog-divider').evaluateAll(dividers => dividers.every(divider => divider.hidden)));
          assert.ok(await page.locator('[data-result-split]').evaluate(element => element.hidden));
          // Explicit sorts still override relevance, while per-row labels remain clear.
          await page.locator('[data-sort]').selectOption('name-desc');
          const names = await page.locator('[data-product-row]:not([hidden])').evaluateAll(rows => rows.map(row => row.dataset.name));
          assert.deepEqual(names, [...names].sort((a, b) => b.localeCompare(a)));
          assert.equal(new URL(page.url()).searchParams.get('sort'), 'name-desc');
          await page.locator('[data-sort]').selectOption('published-asc');
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await page.locator('#site-search').fill('');
          await page.locator('#site-search').blur();
          assert.equal(await page.locator('[data-search-close-match]:not([hidden])').count(), 0);
          assert.notEqual(await page.locator('[data-sort] option:checked').textContent(), labels[0]);
          await open('ship=CN&currency=CNY&q=shiamno&category=family%3Agravel');
          assert.ok((await foundIds()).length);
          assert.ok(await page.locator('[data-product-row]:not([hidden])').evaluateAll(rows => rows.every(row => row.dataset.family === 'gravel')));
          await open('ship=CN&currency=CNY&q=shiamno&max=0&maxCurrency=CNY');
          assert.deepEqual(await foundIds(), []);
        }
        // Desktop and phone pricing: references do not enter delivered budgets.
        if (locale === 'en' && theme === 'light' && [1440, 390].includes(width)) {
          for (const [country, currency] of [['CN', 'CNY'], ['DE', 'EUR'], ['US', 'USD'], ['HK', 'USD']]) {
            await open(`ship=${country}&currency=${currency}&sort=price-asc`);
            const pricing = await page.evaluate(() => {
              const rows = [...document.querySelectorAll('[data-product-row]:not([hidden])')];
              return { values: rows.map(row => row.dataset.priceSort).filter(value => value !== '').map(Number),
                indicator: document.querySelector('[data-sort-heading="price"]').closest('[role="columnheader"]').getAttribute('aria-sort'),
                status: document.querySelector('[data-sort-status]').textContent };
            });
            assert.deepEqual(pricing.values, [...pricing.values].sort((a, b) => a - b));
            if (!pricing.values.length && country !== 'CN') {
              assert.equal(pricing.indicator, 'none');
              assert.ok(pricing.status.includes('No delivered totals'));
            }
            await open(`ship=${country}&currency=${currency}&max=0&maxCurrency=${currency}`);
            assert.equal(await page.locator('[data-product-row]:not([hidden])').count(), 0, `${country}: zero budget`);
          }
          await open('ship=CN&currency=CNY');
          await page.locator(`${width < 960 ? '.family-chips' : '.category-tree'} [data-category-value="family:gravel"]`).click();
          assert.ok((new URL(page.url()).searchParams.get('category') || '').includes('gravel'));
          assert.ok(await page.locator('[data-product-row]:not([hidden])').evaluateAll(rows => rows.every(row => row.dataset.family === 'gravel')));
          await open('ship=HK&currency=USD&sort=china-asc');
          const references = await page.locator('[data-product-row]:not([hidden])').evaluateAll(rows => rows.map(row => row.dataset.chinaSort).filter(value => value !== '').map(Number));
          assert.deepEqual(references, [...references].sort((a, b) => a - b));
          await open('ship=CN&currency=CNY');
          if (width < 960) {
            const trigger = page.locator('.tray-filters');
            await trigger.click();
            assert.equal(await page.locator('[data-filter-sheet]').getAttribute('aria-modal'), 'true');
            await page.keyboard.press('Escape');
            assert.ok(await trigger.evaluate(element => element === document.activeElement));
          }
          await page.locator('[data-settings-toggle]').click();
          if (width < 960) {
            assert.equal(await page.locator('[data-settings-panel]').getAttribute('aria-modal'), 'true');
            assert.ok(await page.locator('main').evaluate(element => element.inert));
          }
          await page.keyboard.press('Escape');
          assert.ok(await page.locator('main').evaluate(element => !element.inert));
          assert.ok(await page.locator('[data-settings-toggle]').evaluate(element => element === document.activeElement));
          const ids = ['twitter-v3-wheeltop-eds', 'incolor-speedster-sr-frameset'];
          for (const id of ids) {
            const input = page.locator(`[data-compare-id="${id}"]`);
            await input.focus();
            await input.press('Space');
            assert.ok(await input.isChecked());
          }
          await page.locator('[data-open-compare]').click();
          assert.ok(await page.locator('[data-inline-compare]').isVisible());
          if (width < 600) assert.ok(await page.locator('[data-compare-content] .compare-grid').first().evaluate(table => table.getBoundingClientRect().width <= table.parentElement.clientWidth + 1), 'two bikes fit without horizontal scrolling');
          assert.equal(await page.locator('[data-compare-field="weight-complete"]').count(), 1);
          assert.equal(await page.locator('[data-compare-field="weight-frame"]').count(), 1);
          assert.equal(await page.locator('[data-compare-content] table').count() >= 1, true);
          await page.locator(`[data-move-compare="${ids[0]}"][data-direction="right"]`).click();
          assert.equal(new URL(page.url()).searchParams.get('compare'), [...ids].reverse().join(','));
          await page.locator('[data-compare-differences]').check();
          assert.equal(new URL(page.url()).searchParams.get('diff'), '1');
          await page.screenshot({ path: path.join(reports, `compare-${width}.png`) });
          await page.reload({ waitUntil: 'load' });
          await page.waitForFunction(() => !document.querySelector('[data-inline-compare]').hidden);
          assert.equal(await page.locator('[data-compare-differences]').isChecked(), true);
          assert.ok((await page.locator('.compare-context').textContent()).includes('unless marked Delivered'));
          // Back/Forward must restore comparison options before rendering can rewrite the URL.
          const startLink = await page.locator('.starting-point').first().getAttribute('href');
          await page.goto(`http://preview.invalid${startLink}`, { waitUntil: 'load' });
          await page.waitForFunction(() => !document.querySelector('[data-inline-compare]').hidden);
          await page.locator('[data-compare-differences]').check();
          const originalComparison = new URL(page.url()).searchParams;
          await page.locator(`${width < 960 ? '.family-chips' : '.category-tree'} [data-category-value="family:gravel"]`).click();
          await page.locator('[data-compare-differences]').uncheck();
          await page.locator('[data-move-compare][data-direction="right"]').first().click();
          const movedComparison = new URL(page.url()).searchParams.get('compare');
          await page.goBack();
          await page.waitForFunction(() => document.querySelector('[data-compare-differences]').checked);
          assert.equal(new URL(page.url()).searchParams.get('start'), originalComparison.get('start'));
          assert.equal(new URL(page.url()).searchParams.get('compare'), originalComparison.get('compare'));
          assert.ok((await page.locator('.compare-context').textContent()).includes('Starting point:'));
          await page.goForward();
          await page.waitForFunction(() => !document.querySelector('[data-compare-differences]').checked);
          assert.equal(new URL(page.url()).searchParams.get('compare'), movedComparison);
          assert.equal(new URL(page.url()).searchParams.has('start'), false);
        }
        // The model decision panel retains identity, evidence and price history.
        if ([1440, 320].includes(width)) {
          await page.goto(`http://preview.invalid${prefix}/models/twitter-v3-wheeltop-eds/`, { waitUntil: 'load' });
          assert.ok(await page.locator('.model-verify').isVisible());
          assert.equal(await page.locator('h1').count(), 1);
          assert.ok(await page.locator('#source-records').count());
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          if (locale === 'en' && width === 1440 && theme === 'light') await page.screenshot({ path: path.join(reports, 'model-desktop.png') });
        }
        assert.deepEqual(errors, [], name);
        results.push({ name, ...state, passed: true });
      } catch (error) {
        await page.screenshot({ path: path.join(reports, `failure-${name}.png`) });
        console.error(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('body *')].map(element => ({ tag: element.tagName, cls: element.className, right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) })).filter(item => item.right > innerWidth + 1 && item.width).slice(0, 12))));
        throw new Error(`${name}: ${error.message}`);
      } finally { await context.close(); }
    }
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    await noJs.route('**/*', route => {
      const url = new URL(route.request().url());
      const file = path.join(site, url.pathname === '/' ? 'index.html' : url.pathname);
      if (url.hostname !== 'preview.invalid' || !fs.existsSync(file)) return route.abort();
      return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'application/octet-stream' });
    });
    const page = await noJs.newPage();
    await page.goto('http://preview.invalid/');
    assert.equal(await page.locator('[data-product-row]').count(), 263);
    assert.ok(await page.locator('[data-model-link]').count() >= 263);
    await noJs.close();
    fs.writeFileSync(path.join(reports, 'results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ passed: results.length, pricingDestinations: ['CN', 'DE', 'US', 'HK'], noJavaScript: true, reports }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exit(1); });
