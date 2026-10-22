import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { m } from '@/paraglide/messages.js'
import { useThemeContext } from '@/providers/ThemeProvider'
import { cn } from '@/utils/cn'
import type { ActiveTheme, Theme } from '@/providers/ThemeProvider'

type IconProps = {
  className?: string
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const SunIcon = ({ className }: IconProps) => (
  <svg className={className} {...iconProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
)

const MoonIcon = ({ className }: IconProps) => (
  <svg className={className} {...iconProps}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
)

const MonitorIcon = ({ className }: IconProps) => (
  <svg className={className} {...iconProps}>
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
  </svg>
)

const CheckIcon = ({ className }: IconProps) => (
  <svg className={className} {...iconProps}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

/*
 * The current mode is only known on the client (localStorage), so anything
 * visual keys off html[data-theme-mode] — set pre-paint by the head script
 * in routes/__root.tsx — through the theme-auto/light/dark variants
 * (tailwind.css) instead of React state. SSR markup stays mode-independent
 * and the trigger shows the right icon from the first frame.
 */
const THEME_OPTIONS: {
  value: Theme
  label: () => string
  Icon: (props: IconProps) => React.ReactNode
  triggerIcon: string
  check: string
}[] = [
  {
    value: 'light',
    label: m.theme_light,
    Icon: SunIcon,
    triggerIcon: 'theme-light:rotate-0 theme-light:scale-100',
    check: 'theme-light:inline-block',
  },
  {
    value: 'auto',
    label: m.theme_auto,
    Icon: MonitorIcon,
    triggerIcon: 'theme-auto:rotate-0 theme-auto:scale-100',
    check: 'theme-auto:inline-block',
  },
  {
    value: 'dark',
    label: m.theme_dark,
    Icon: MoonIcon,
    triggerIcon: 'theme-dark:rotate-0 theme-dark:scale-100',
    check: 'theme-dark:inline-block',
  },
]

const subscribeMount = () => () => {}
const isMounted = () => true
const isNotMounted = () => false

export const ThemeSwitch = () => {
  const { theme, activeTheme, setTheme } = useThemeContext()

  // aria-checked can't be CSS-driven, and the stored mode differs from the
  // server-rendered default — render the server's 'auto' until mounted so
  // hydration stays clean, then correct it.
  const mounted = useSyncExternalStore(subscribeMount, isMounted, isNotMounted)
  const displayMode: Theme = mounted ? theme : 'auto'

  const selectTheme = (mode: Theme, origin: HTMLElement) => {
    const nextResolved: ActiveTheme =
      mode === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : mode

    const apply = () => {
      // Paint the new theme within this frame: the provider applies the
      // attributes from a passive effect, which startViewTransition's
      // new-state snapshot must not wait for.
      const root = document.documentElement
      root.setAttribute('data-theme', nextResolved)
      root.setAttribute('data-theme-mode', mode)
      flushSync(() => setTheme(mode))
    }

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    // No reveal when the resolved theme stays the same (e.g. auto → light
    // on a light-mode OS): both snapshots would be identical.
    if (
      !document.startViewTransition ||
      reduceMotion ||
      nextResolved === activeTheme
    ) {
      apply()
      return
    }

    // Expand a circle from the clicked option until it covers the farthest
    // corner; the reveal itself is CSS (theme-reveal keyframes in
    // tailwind.css), driven by these custom properties on the root.
    const rect = origin.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    const root = document.documentElement
    root.style.setProperty('--theme-transition-x', `${x}px`)
    root.style.setProperty('--theme-transition-y', `${y}px`)
    root.style.setProperty('--theme-transition-radius', `${radius}px`)

    // Transition types scope the reveal CSS to theme changes. Browsers
    // that ship startViewTransition without the options form (e.g. Safari
    // 18.0–18.3) would silently drop an options-object update callback, so
    // fall back to the plain form there (default cross-fade).
    const supportsTypes =
      'ViewTransition' in window &&
      'types' in (window.ViewTransition as { prototype: object }).prototype
    const transition = supportsTypes
      ? document.startViewTransition({ update: apply, types: ['theme-change'] })
      : document.startViewTransition(apply)

    const cleanup = () => {
      root.style.removeProperty('--theme-transition-x')
      root.style.removeProperty('--theme-transition-y')
      root.style.removeProperty('--theme-transition-radius')
    }
    transition.finished.then(cleanup, cleanup)
  }

  const closeDropdown = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  // DaisyUI dropdowns open/close on focus; blurring on Escape restores the
  // expected keyboard behavior.
  const closeOnEscape = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeDropdown()
  }

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        className="btn btn-ghost btn-circle relative"
        aria-label={m.theme_toggle()}
        aria-haspopup="menu"
        onKeyDown={closeOnEscape}
      >
        {THEME_OPTIONS.map(({ value, Icon, triggerIcon }) => (
          <Icon
            key={value}
            className={cn(
              'absolute inset-0 m-auto size-5 transition-all duration-300',
              'rotate-90 scale-0',
              triggerIcon,
            )}
          />
        ))}
      </button>
      <ul
        // Keeps focus inside the dropdown when the padding area is clicked,
        // per DaisyUI's focus-based dropdown pattern
        tabIndex={0}
        role="menu"
        className={cn(
          'dropdown-content menu z-50 mt-3 w-40 p-2',
          'rounded-box border border-base-300 bg-base-100 shadow-lg',
        )}
        onKeyDown={closeOnEscape}
      >
        {THEME_OPTIONS.map(({ value, label, Icon, check }) => (
          <li key={value}>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={displayMode === value}
              onClick={e => {
                const item = e.currentTarget
                closeDropdown()
                selectTheme(value, item)
              }}
            >
              <Icon className="size-4" />
              {label()}
              <CheckIcon className={cn('ml-auto hidden size-4', check)} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
