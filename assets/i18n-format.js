// Locale formatting for amounts and measurements inside translated interface text.
// English source strings use ¥1,234 and 9.9 kg; interface languages reformat them
// without changing the value. Commas count as thousands separators only before three digits.
const currencies = { 'US$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'CNY' };
const amount = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?`;
const moneyPattern = new RegExp(String.raw`(US\$|€|£|¥)(${amount})(?:–(${amount}))?`, 'g');
const measurePattern = new RegExp(String.raw`(${amount})\s?(kg|mm|g|кг|мм|г)(?![A-Za-zА-Яа-яЁё])`, 'g');
const measureOnly = new RegExp(String.raw`^[≈~+−\-\s]*(?:(?:US\$|€|£|¥)(?:${amount})(?:–(?:${amount}))?|(?:${amount})\s?(?:kg|mm|g))$`);
const formatters = new Map();

function formatter(locale, currency = '') {
  const key = `${locale}|${currency}`;
  if (!formatters.has(key)) formatters.set(key, new Intl.NumberFormat(locale, currency
    ? { style: 'currency', currency, currencyDisplay: currency === 'CNY' ? 'narrowSymbol' : 'symbol', minimumFractionDigits: 0, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 2 }));
  return formatters.get(key);
}

const value = (raw) => Number(raw.replace(/,/g, ''));

export function isMeasure(text) {
  return measureOnly.test(text);
}

export function localizeMeasures(text, locale, units = {}) {
  if (typeof text !== 'string') return text;
  const number = formatter(locale);
  return text
    .replace(moneyPattern, (_, symbol, low, high) => {
      const money = formatter(locale, currencies[symbol]);
      if (!high) return money.format(value(low));
      // A range shows the currency once, on the side the locale puts it.
      const parts = money.formatToParts(value(high));
      const sign = parts.find((part) => part.type === 'currency')?.value ?? symbol;
      const prefix = parts.findIndex((part) => part.type === 'currency') < parts.findIndex((part) => part.type === 'integer');
      const range = `${number.format(value(low))}–${number.format(value(high))}`;
      return prefix ? `${sign}${range}` : `${range} ${sign}`;
    })
    .replace(measurePattern, (_, size, unit) => `${number.format(value(size))} ${units[unit] ?? unit}`);
}
