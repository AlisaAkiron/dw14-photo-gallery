import { LOCALE_NAMES } from '@/lib/i18n'
import { m } from '@/paraglide/messages.js'
import { getLocale, locales, setLocale } from '@/paraglide/runtime.js'
import { cn } from '@/utils/cn'

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
)

/**
 * Switching language is a full navigation to the same page under the other
 * locale's prefix (Paraglide's setLocale), which also remembers the choice
 * in a cookie for visits to the bare '/'.
 */
export const LocaleSwitch = () => {
  const current = getLocale()

  const closeOnEscape = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        className="btn btn-ghost gap-1.5 px-2.5"
        aria-label={m.language_label()}
        aria-haspopup="menu"
        onKeyDown={closeOnEscape}
      >
        <GlobeIcon className="size-5" />
        <span className="hidden text-sm font-normal sm:inline">
          {LOCALE_NAMES[current]}
        </span>
      </button>
      <ul
        tabIndex={0}
        role="menu"
        className={cn(
          'dropdown-content menu z-50 mt-3 w-40 p-2',
          'rounded-box border border-base-300 bg-base-100 shadow-lg',
        )}
        onKeyDown={closeOnEscape}
      >
        {locales.map(locale => (
          <li key={locale}>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={locale === current}
              lang={locale}
              className={cn(locale === current && 'menu-active')}
              onClick={() => {
                if (locale !== current) setLocale(locale)
              }}
            >
              {LOCALE_NAMES[locale]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
