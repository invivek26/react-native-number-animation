const MAX_CACHE_SIZE = 64;
const FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

const serializeLocales = (locales?: Intl.LocalesArgument): string => {
  if (locales == null) {
    return '';
  }

  if (typeof locales === 'string') {
    return locales;
  }

  if (!Array.isArray(locales)) {
    return locales.toString();
  }

  return Array.from(locales as readonly (string | Intl.Locale)[], (locale) =>
    locale.toString()
  ).join(',');
};

const getFormatterKey = (
  locales: Intl.LocalesArgument | undefined,
  options: Intl.NumberFormatOptions
): string => `${serializeLocales(locales)}:${JSON.stringify(options)}`;

export const getNumberFormatter = (
  locales: Intl.LocalesArgument | undefined,
  options: Intl.NumberFormatOptions
): Intl.NumberFormat => {
  const key = getFormatterKey(locales, options);
  const cached = FORMATTER_CACHE.get(key);

  if (cached != null) {
    FORMATTER_CACHE.delete(key);
    FORMATTER_CACHE.set(key, cached);
    return cached;
  }

  const formatter = new Intl.NumberFormat(locales, options);
  FORMATTER_CACHE.set(key, formatter);

  if (FORMATTER_CACHE.size > MAX_CACHE_SIZE) {
    const oldestKey = FORMATTER_CACHE.keys().next().value;
    if (oldestKey != null) {
      FORMATTER_CACHE.delete(oldestKey);
    }
  }

  return formatter;
};
