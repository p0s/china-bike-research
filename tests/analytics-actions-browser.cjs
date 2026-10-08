// Optional rendered-browser proof. Supply the locally installed Playwright
// package through PLAYWRIGHT_PACKAGE; this adds no production dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const reports = path.resolve(process.argv[2]);
const origin = 'https://chinesebikes.xyz';
const catalog = JSON.parse(fs.readFileSync(path.join(dist, 'data/home-catalog-en.json')));
const selected = catalog.slice(0, 2).map(item => item.id).join(',');
const mime = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.html': 'text/html', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
fs.mkdirSync(reports, { recursive: true });

async function fixture(browser, width, { delayed = false, blocked = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 960 } });
  const requests = [], errors = [];
  let release;
  const gate = delayed ? new Promise(resolve => { release = resolve; }) : Promise.resolve();
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) {
      await route.fulfill({ contentType: 'text/html', body: '<p>External destination fixture</p>' });
      return;
    }
    if (url.pathname.startsWith('/analytics/')) {
      if (['/analytics/event', '/analytics/action'].includes(url.pathname)) {
        requests.push({ path: url.pathname, headers: {
          page: request.headers()['x-analytics-path'], count: request.headers()['x-comparison-count']
        }, body: request.postData() });
      }
      await route.fulfill({ status: 204 }); return;
    }
    if (url.pathname === '/assets/analytics-event.js') {
      if (blocked) { await route.abort('blockedbyclient'); return; }
      await gate;
    }
    let file = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(dist + path.sep) && file !== dist) { await route.abort(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { await route.fulfill({ status: 404, body: '' }); return; }
    try { await route.fulfill({ body: fs.readFileSync(file), contentType: mime[path.extname(file)] || 'application/octet-stream' }); }
    catch (error) { if (!context.pages().length) return; throw error; }
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, requests, errors, release: () => release?.(),
    events: () => requests.filter(request => request.path === '/analytics/event'),
    actions: () => requests.filter(request => request.path === '/analytics/action') };
}

async function waitFor(check) {
  const deadline = Date.now() + 4000;
  while (!check()) { assert.ok(Date.now() < deadline, 'Expected mocked action did not arrive'); await new Promise(resolve => setTimeout(resolve, 20)); }
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const passed = [];
  try {
    for (const width of [1440, 390, 320]) for (const locale of ['', 'zh/', 'de/']) {
      const f = await fixture(browser, width, { delayed: true });
      try {
        await f.page.goto(origin + '/' + locale + '?compare=' + selected, { waitUntil: 'domcontentloaded' });
        await f.page.locator('[data-inline-compare]').waitFor({ state: 'visible' });
        assert.equal(f.events().length, 0);
        f.release(); await waitFor(() => f.events().length === 1);
        assert.equal(f.events()[0].headers.page, '/' + locale);
        assert.equal(f.events()[0].headers.count, '2');
        assert.equal(f.events()[0].body, null);
        await f.page.locator('[data-close-compare]').click();
        await f.page.locator('[data-open-compare]').click();
        await waitFor(() => f.events().length === 2);
        assert.ok(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await f.page.screenshot({ path: path.join(reports, 'comparison-' + (locale || 'en').replace('/', '') + '-' + width + '.png') });
        assert.deepEqual(f.errors, []);
        passed.push(width + ' ' + (locale || 'en') + ': delayed shared-link open once, close/reopen, no overflow/errors');
      } finally { f.release(); await f.context.close(); }
    }

    const stopped = await fixture(browser, 390, { delayed: true });
    try {
      await stopped.page.goto(origin + '/?compare=' + selected, { waitUntil: 'domcontentloaded' });
      await stopped.page.locator('[data-inline-compare]').waitFor({ state: 'visible' });
      await stopped.page.evaluate(() => { window.p0sAnalyticsStopped = true; });
      stopped.release(); await stopped.page.waitForLoadState('networkidle');
      assert.equal(stopped.requests.length, 0);
      passed.push('opt-out before module resolution suppresses the pending open');
    } finally { stopped.release(); await stopped.context.close(); }

    const blocked = await fixture(browser, 390, { blocked: true });
    try {
      await blocked.page.goto(origin + '/?compare=' + selected, { waitUntil: 'networkidle' });
      await blocked.page.locator('[data-inline-compare]').waitFor({ state: 'visible' });
      await blocked.page.locator('[data-filter-search]').fill('sava');
      assert.equal(blocked.requests.length, 0);
      assert.deepEqual(blocked.errors, []);
      passed.push('blocked analytics module leaves comparison and search working');
    } finally { await blocked.context.close(); }

    for (const width of [1440, 390]) for (const locale of ['', 'zh/', 'de/']) {
      const f = await fixture(browser, width);
      try {
        await f.page.goto(origin + '/' + locale + '?ship=US&currency=USD&area=contiguous', { waitUntil: 'networkidle' });
        const offer = f.page.locator('.regional-offer-link[data-analytics-offer]').first();
        await offer.waitFor({ state: 'visible' });
        const id = await offer.getAttribute('data-analytics-offer');
        assert.equal(await f.page.locator('.regional-policy-link[data-analytics-action]').count(), 0);
        await offer.click();
        await waitFor(() => f.actions().length === 1);
        assert.deepEqual(JSON.parse(f.actions()[0].body), { actionId: 'product_outbound_click', pagePath: '/' + locale, offerId: id });
        assert.deepEqual(f.errors, []);
        passed.push(width + ' ' + (locale || 'en') + ': trusted offer click with actual page; policy links unmarked');
      } finally { await f.context.close(); }
    }

    const departing = await fixture(browser, 390, { delayed: true });
    try {
      await departing.page.goto(origin + '/?ship=US&currency=USD&area=contiguous', { waitUntil: 'domcontentloaded' });
      const offer = departing.page.locator('.regional-offer-link[data-analytics-offer]').first();
      await offer.waitFor({ state: 'visible' });
      await offer.click();
      await departing.page.waitForURL(url => url.origin !== origin);
      departing.release();
      assert.equal(departing.requests.length, 0);
      passed.push('departure before optional load remains best-effort and navigation is not held');
    } finally { departing.release(); await departing.context.close(); }
    fs.writeFileSync(path.join(reports, 'results.json'), JSON.stringify({ passed, productionRequests: 0 }, null, 2));
    console.log(JSON.stringify({ passed, productionRequests: 0 }, null, 2));
  } finally {
    // Disconnect the CDP client; preserve the shared dedicated research browser.
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
