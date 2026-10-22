import { createRouter } from '@tanstack/react-router'
import { deLocalizeUrl, localizeUrl } from '@/paraglide/runtime.js'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Routes are defined locale-free (/photos); the locale prefix lives
    // only in the address bar and in rendered hrefs (/ja/photos).
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
  interface HistoryState {
    /** Set when the viewer was opened from the gallery grid */
    fromGallery?: boolean
  }
}
