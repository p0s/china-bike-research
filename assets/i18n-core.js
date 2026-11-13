// Each language registers its translator when its dictionary module loads. A page
// loads only its own dictionary, so English visitors download none of them.
const registeredTranslators = new Map();
export function registerTranslator(locale, translator) {
  registeredTranslators.set(locale, translator);
}

export function translate(value, locale = 'en') {
  const registered = registeredTranslators.get(locale);
  return registered ? registered(value) : value;
}
