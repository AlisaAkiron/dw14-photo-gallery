/**
 * Every locale lives under its own prefix, including the base locale, so a
 * shared link always opens in the language it was shared in. The bare
 * root '/' matches no pattern; Paraglide's middleware then resolves the
 * locale from cookie / Accept-Language and redirects.
 *
 * The exact '/' rule comes before the wildcard so the locale roots are
 * '/en' rather than '/en/' (avoids a redirect on every home link).
 */
const prefixes = {
  en: 'en',
  'zh-Hans': 'zh-hans',
  'zh-Hant': 'zh-hant',
  ja: 'ja',
} as const

export const urlPatterns = [
  {
    pattern: '/',
    localized: Object.entries(prefixes).map(
      ([locale, prefix]) => [locale, `/${prefix}`] as [string, string],
    ),
  },
  {
    pattern: '/:path(.*)?',
    localized: Object.entries(prefixes).map(
      ([locale, prefix]) =>
        [locale, `/${prefix}/:path(.*)?`] as [string, string],
    ),
  },
]
