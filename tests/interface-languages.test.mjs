import test from 'node:test';
import assert from 'node:assert/strict';
import { translate } from '../assets/i18n.js';
import { es } from '../assets/i18n-es.js';
import { ru } from '../assets/i18n-ru.js';
import { geometryCopy } from '../assets/geometry-copy.js';
import { ALL_LOCALES, INTERFACE_LOCALES, INTERFACE_ROUTES, availableLocalePath, localePath, localesForRoute, localizedHref, routeLocale } from '../src/lib/i18n.mjs';
import { layout } from '../src/lib/html.mjs';
import { loadDataset } from '../src/lib/data.mjs';
import { isEligibleDocumentPath } from '../worker/index.mjs';

const siteUrl = 'https://chinesebikes.xyz';
const data = loadDataset();

test('Spanish and Russian cover only the core decision routes', () => {
  assert.deepEqual(INTERFACE_LOCALES, ['es', 'ru']);
  assert.deepEqual(ALL_LOCALES, ['en', 'zh-Hans', 'de', 'es', 'ru']);
  for (const route of INTERFACE_ROUTES) assert.deepEqual(localesForRoute(route), ALL_LOCALES, route);
  for (const route of ['/models/example/', '/blog/', '/methodology/', '/privacy/']) assert.deepEqual(localesForRoute(route), ['en', 'zh-Hans', 'de'], route);
  assert.equal(localePath('/geometry/', 'es'), '/es/geometry/');
  assert.equal(routeLocale('/ru/build/'), 'ru');
  // Links from an interface-only page to an untranslated route lead to English.
  assert.equal(availableLocalePath('/models/example/', 'ru'), '/models/example/');
  assert.equal(localizedHref('/models/example/?compare=a#sources', { locale: 'es' }), '/models/example/?compare=a#sources');
  assert.equal(localizedHref('/build/?base=af01-frameset', { locale: 'es' }), '/es/build/?base=af01-frameset');
  for (const locale of INTERFACE_LOCALES) {
    for (const route of INTERFACE_ROUTES.filter((item) => item !== '/404.html')) assert.equal(isEligibleDocumentPath(localePath(route, locale)), false, `${locale}${route}`);
  }
});

for (const locale of INTERFACE_LOCALES) test(`${locale} pages are self-canonical with reciprocal alternates, a language menu and a scope note`, () => {
  const ctx = { data, base: '', locale, siteUrl, repositoryUrl: 'https://github.com/p0s/china-bike-research' };
  const html = layout({ ...ctx, path: '/geometry/', title: 'Geometry', description: 'Compare frame sizes', body: '<h1>Geometry</h1>' });
  assert.ok(html.includes(`<html lang="${locale}">`));
  assert.ok(html.includes(`<link rel="canonical" href="${siteUrl}/${locale}/geometry/">`));
  for (const other of ALL_LOCALES) assert.ok(html.includes(`hreflang="${other}" href="${siteUrl}${localePath('/geometry/', other)}"`), other);
  assert.ok(html.includes(`hreflang="x-default" href="${siteUrl}/geometry/"`));
  assert.match(html, /data-language-menu/);
  assert.ok(html.includes(`<script src="/assets/i18n-${locale}.js"`) || html.includes(`/assets/i18n-${locale}.js`));
  const note = locale === 'es' ? 'Las descripciones de productos y las notas de evidencia siguen en inglés' : 'Описания товаров и примечания к данным остаются на английском';
  assert.ok(html.includes(note), 'visible scope note');
  // A page outside the interface routes keeps the three research languages only.
  const model = layout({ ...ctx, locale: 'en', path: '/methodology/', title: 'Methodology', description: 'How it works', body: '<h1>Methodology</h1>' });
  assert.equal(model.includes(`hreflang="${locale}"`), false);
});

test('interface dictionaries translate navigation, controls and dynamic statuses', () => {
  const samples = ['Bikes', 'Components', 'Tools', 'Groupsets', 'Carbon wheels', 'Geometry', 'Build planner', 'Compare', 'Differences only', 'Gallery', 'Table'];
  for (const [locale, dictionary] of [['es', es], ['ru', ru]]) {
    for (const key of samples) {
      assert.ok(dictionary[key], `${locale}: ${key}`);
      assert.equal(translate(key, locale), dictionary[key]);
    }
    assert.notEqual(translate('3 identical rows hidden', locale), '3 identical rows hidden');
    assert.notEqual(translate('12 wheelsets shown', locale), '12 wheelsets shown');
    assert.notEqual(geometryCopy(locale).glossary, geometryCopy('en').glossary);
  }
  assert.equal(translate('Bikes', 'ru'), ru.Bikes);
  // Russian plural forms follow the count.
  assert.match(translate('1 identical row hidden', 'ru'), /строка/);
  assert.match(translate('5 identical rows hidden', 'ru'), /строк$/);
});
