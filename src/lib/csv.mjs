/** CSV quoting plus spreadsheet formula neutralization for untrusted text.
 * Raw, lossless values remain in JSON. Do not treat CSV as a round-trip store.
 * Reference: https://owasp.org/www-community/attacks/CSV_Injection
 */
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && (/^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** A missing fact must never be exported as a negative fact. */
export function booleanCell(value) {
  return value === true ? 'yes' : value === false ? 'no' : '';
}
