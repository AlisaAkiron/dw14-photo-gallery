import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ErrorPage } from '@/components/shared/ErrorPage'
import { NotFound } from '@/components/shared/NotFound'
import { m } from '@/paraglide/messages.js'
import type { Locale } from '@/paraglide/runtime.js'
import {
  getLocale,
  getUrlOrigin,
  localizeHref,
  locales,
} from '@/paraglide/runtime.js'
import { ThemeProvider } from '@/providers/ThemeProvider'
import appCss from '@/styles/index.css?url'
import miSansCss from 'misans/lib/Normal/MiSansVF.min.css?url'
import miSansTcCss from 'misans/lib/TC/MiSansTCVF.min.css?url'

// Applies the persisted theme before first paint so a stored choice that
// differs from the OS preference doesn't flash the wrong theme. data-theme
// carries the resolved theme (drives DaisyUI); data-theme-mode carries the
// stored mode incl. 'auto' (drives ThemeSwitch's CSS-only current-mode UI).
// Keep the storage key and the auto → OS resolution in sync with
// ThemeProvider (which owns both attributes after hydration; the value is
// JSON-encoded by @mantine/hooks' useLocalStorage).
const themeInitScript = `(function(){var m;try{m=JSON.parse(localStorage.getItem('dw14-theme'))}catch(e){}if(m!=='light'&&m!=='dark'&&m!=='auto'){m='auto'}var t=m==='auto'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;var r=document.documentElement;r.setAttribute('data-theme',t);r.setAttribute('data-theme-mode',m)})()`

// Only the face the page's language renders with (see tailwind.css)
const FONT_CSS: Partial<Record<Locale, string>> = {
  en: miSansCss,
  'zh-Hans': miSansCss,
  'zh-Hant': miSansTcCss,
}

export const Route = createRootRoute({
  head: ({ matches }) => {
    const locale = getLocale()
    const fontCss = FONT_CSS[locale]
    // Routes are locale-free internally; the leaf match's pathname is the
    // same page in every language.
    const pathname = matches.at(-1)?.pathname ?? '/'
    const origin = getUrlOrigin()
    const canonical = origin + localizeHref(pathname)
    const alternates = locales.map(hreflang => ({
      rel: 'alternate',
      hrefLang: hreflang,
      href: origin + localizeHref(pathname, { locale: hreflang }),
    }))

    return {
      meta: [
        { charSet: 'utf-8' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        { title: m.site_title() },
        { name: 'description', content: m.meta_description() },
        { name: 'theme-color', content: '#c8414c' },
        // Child routes' tags with the same name/property win
        { property: 'og:site_name', content: m.site_title() },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: canonical },
        // Title card rendered by scripts/gen-og.ts; photo pages use the photo
        { property: 'og:image', content: `${origin}/og/${locale}.png` },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        ...(fontCss ? [{ rel: 'stylesheet', href: fontCss }] : []),
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'canonical', href: canonical },
        ...alternates,
        // Bare paths redirect to the visitor's preferred language
        { rel: 'alternate', hrefLang: 'x-default', href: origin + pathname },
      ],
      // head() scripts land in <head> via HeadContent (blocking, pre-paint);
      // the route-level scripts() option would render at the end of <body>
      // instead — too late to prevent the flash.
      scripts: [{ children: themeInitScript }],
    }
  },
  notFoundComponent: () => <NotFound />,
  errorComponent: ErrorPage,
  // The shell wraps every render, including the error and not-found
  // components above, so those still get <html>, styles and the theme.
  shellComponent: RootDocument,
  component: Outlet,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // data-theme / data-theme-mode are set by themeInitScript before
    // hydration, so they never match the server markup
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
