import { freshness, formatPrice, joinCatalogCandidates } from './data.mjs';

// Regional offers are selected for 90 days after observation (assets/regional-prices.js).
const OFFER_WINDOW_DAYS = 90;
const EXPIRING_SOON_DAYS = 30;

const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const amount = (value, currency) => Number.isFinite(value) ? `${currency} ${value}` : '—';
const observationAmount = (item) => Number.isFinite(item.amount)
  ? amount(item.amount, item.currency)
  : Number.isFinite(item.low) ? `${item.currency} ${item.low}${Number.isFinite(item.high) && item.high !== item.low ? `–${item.high}` : ''}` : '—';

/**
 * Every dated price, link and rate the site shows, with its age. Old evidence stays
 * useful history; the report only says what to recheck. It never refreshes a date.
 */
export function freshnessReport(data, now = new Date()) {
  const dated = (area, id, label, date, value) => ({ area, id, label, date: date ?? '', value, freshness: freshness(date, now) });
  const catalogPrices = data.prices.filter((price) => !price.market_ids)
    .map((price) => dated('Catalog price', price.variant_id, price.id, price.observed_at, formatPrice(price)));
  const candidatePrices = joinCatalogCandidates(data).filter((entry) => entry.price)
    .map((entry) => dated('Research-profile price', entry.candidate.id, entry.candidate.name, entry.price.observed_at ?? entry.candidate.observed_at, formatPrice(entry.price)));
  const componentPrices = [['Groupset price', data.groupsets], ['Wheelset price', data.wheelsets], ['Tire price', data.tires]]
    .flatMap(([area, records]) => (records ?? []).flatMap((record) => (record.price_observations ?? [])
      .map((item) => dated(area, record.id, record.name ?? record.id, item.observed_at, observationAmount(item)))));
  const storeLinks = (data.shoppingLinks ?? []).flatMap((store) => (store.links ?? [])
    .map((link) => dated('Store link', link.record_id, store.name, link.checked_at, link.price_low === undefined ? '—' : `${store.currency} ${link.price_low}${link.price_high && link.price_high !== link.price_low ? `–${link.price_high}` : ''}`)));
  const rates = [...(data.exchangeRates ?? [])].sort((a, b) => b.rate_date.localeCompare(a.rate_date));
  const exchangeRates = rates.slice(0, 1).map((rate) => dated('Exchange rates', rate.id, 'Newest ECB snapshot', rate.rate_date, `${Object.keys(rate.per_eur).length} currencies`));
  const today = now.toISOString().slice(0, 10);
  const superseded = new Set(data.prices.flatMap((price) => price.supersedes ?? []));
  const offers = data.prices.filter((price) => price.market_ids && !superseded.has(price.id))
    .map((price) => ({ ...dated('Regional offer', price.variant_id, price.id, price.observed_at, amount(price.amount, price.currency)), selectedUntil: addDays(price.observed_at, OFFER_WINDOW_DAYS) }))
    .map((offer) => ({ ...offer, expired: offer.selectedUntil < today, expiresSoon: offer.selectedUntil >= today && offer.selectedUntil <= addDays(today, EXPIRING_SOON_DAYS) }));
  const entries = [...catalogPrices, ...candidatePrices, ...componentPrices, ...storeLinks, ...exchangeRates];
  const old = (item) => ['historical', 'old', 'unknown'].includes(item.freshness.key);
  const areas = [...new Set([...entries.map((item) => item.area), 'Regional offer'])].map((area) => {
    const items = area === 'Regional offer' ? offers : entries.filter((item) => item.area === area);
    const dates = items.map((item) => item.date).filter(Boolean).sort();
    return { area, total: items.length, olderThan90Days: items.filter(old).length, oldest: dates[0] ?? '', newest: dates.at(-1) ?? '' };
  });
  return {
    generatedAt: now.toISOString(),
    areas,
    old: entries.filter(old).sort((a, b) => (b.freshness.days ?? Infinity) - (a.freshness.days ?? Infinity) || a.area.localeCompare(b.area) || a.id.localeCompare(b.id)),
    offers: offers.filter((offer) => offer.expired || offer.expiresSoon).sort((a, b) => a.selectedUntil.localeCompare(b.selectedUntil) || a.label.localeCompare(b.label)),
    exchangeRates: exchangeRates[0] ?? null
  };
}

export function freshnessMarkdown(report) {
  const cell = (value) => String(value ?? '').replaceAll('|', '\\|');
  const row = (cells) => `| ${cells.map(cell).join(' | ')} |`;
  const rates = report.exchangeRates
    ? `Newest exchange-rate snapshot: ${report.exchangeRates.date} (${report.exchangeRates.freshness.days} days old). Every converted price uses it.`
    : 'No exchange-rate snapshot is recorded.';
  return [
    '# Data freshness report', '', `Generated: ${report.generatedAt}`, '', rates, '',
    '## Summary', '', row(['Area', 'Records', 'Older than 90 days', 'Oldest', 'Newest']), row(['---', '---:', '---:', '---', '---']),
    ...report.areas.map((area) => row([area.area, area.total, area.olderThan90Days, area.oldest || '—', area.newest || '—'])), '',
    '## Regional offers expired or expiring within 30 days', '',
    ...(report.offers.length
      ? [row(['Offer', 'Variant', 'Observed', 'Selected until', 'State']), row(['---', '---', '---', '---', '---']),
        ...report.offers.map((offer) => row([offer.label, offer.id, offer.date, offer.selectedUntil, offer.expired ? 'No longer selected' : 'Expires soon']))]
      : ['None.']), '',
    '## Records older than 90 days', '',
    ...(report.old.length
      ? [row(['Area', 'Record', 'Detail', 'Value', 'Date', 'Age', 'Status']), row(['---', '---', '---', '---:', '---', '---:', '---']),
        ...report.old.map((item) => row([item.area, item.id, item.label, item.value, item.date || '—', item.freshness.days === undefined ? '—' : `${item.freshness.days} days`, item.freshness.label]))]
      : ['None.']), '',
    '## Review guidance', '',
    'Old records remain useful history. Recheck the source before adding a new dated observation; never refresh a date without rechecking it. An expired regional offer is no longer selected for delivered prices until a newer observation is recorded.', ''
  ].join('\n');
}
