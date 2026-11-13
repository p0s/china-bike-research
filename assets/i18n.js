// Build and test entry: every dictionary, registered. Browser modules import
// ./i18n-core.js instead, and each page loads only its own dictionary
// (src/lib/html.mjs), so nothing a visitor runs imports this file.
import './i18n-zh.js';
import './i18n-de.js';
import './i18n-es.js';
import './i18n-ru.js';
export { registerTranslator, translate } from './i18n-core.js';
export { zh } from './i18n-zh.js';
