import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { paraglideMiddleware } from '@/paraglide/server.js'

/**
 * Paraglide only matches Accept-Language tags literally or by base language,
 * so zh-CN / zh-TW would find neither zh-Hans nor zh-Hant (there is no bare
 * "zh" locale) and fall back to English. Rewrite region-tagged Chinese to
 * the script-tagged locales before detection.
 */
const TRADITIONAL_REGIONS = new Set(['tw', 'hk', 'mo'])

const normalizeChineseTag = (tag: string) => {
  const parts = tag.toLowerCase().split('-')
  if (parts[0] !== 'zh') return tag
  if (parts.includes('hant')) return 'zh-Hant'
  if (parts.includes('hans')) return 'zh-Hans'
  return parts.some(p => TRADITIONAL_REGIONS.has(p)) ? 'zh-Hant' : 'zh-Hans'
}

const normalizeAcceptLanguage = (request: Request) => {
  const header = request.headers.get('accept-language')
  if (!header || !/\bzh\b/i.test(header)) return request
  const normalized = header
    .split(',')
    .map(range => {
      const [tag = '', ...params] = range.trim().split(';')
      return [normalizeChineseTag(tag.trim()), ...params].join(';')
    })
    .join(',')
  const headers = new Headers(request.headers)
  headers.set('accept-language', normalized)
  return new Request(request, { headers })
}

export default createServerEntry({
  fetch(request) {
    // The handler gets the original (localized) request: the router's
    // rewrite strips the prefix itself, and SSR must see the real URL to
    // hydrate against the browser's.
    return paraglideMiddleware(normalizeAcceptLanguage(request), () =>
      handler.fetch(request),
    )
  },
})
