import { Link } from '@tanstack/react-router'
import { DwLogo } from '@/components/brand/DwLogo'
import { GitHubLink, LocaleSwitch, ThemeSwitch } from '@/components/ui/button'
import { m } from '@/paraglide/messages.js'
import { cn } from '@/utils/cn'

const navLink = cn(
  'rounded-full px-2 py-1.5 text-sm whitespace-nowrap text-base-content/70 transition-colors sm:px-3',
  'hover:text-base-content',
)

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-base-300 bg-base-100/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[96rem] items-center gap-2 px-4 lg:px-8">
        <Link
          to="/"
          aria-label={`${m.site_title()} — ${m.site_subtitle()}`}
          className="flex shrink-0 items-center gap-2 sm:gap-3"
          activeProps={{ className: '' }}
        >
          <DwLogo className="h-5 sm:h-6" />
          <span className="h-5 w-px bg-base-300" aria-hidden />
          <span className="text-sm font-semibold whitespace-nowrap">
            {m.site_short()}
            <span className="hidden font-normal text-base-content/60 sm:inline">
              {' '}
              {m.site_subtitle()}
            </span>
          </span>
        </Link>
        <nav className="ml-1 flex items-center sm:ml-6">
          <Link
            to="/"
            className={cn(navLink, 'max-sm:hidden')}
            activeOptions={{ exact: true }}
            activeProps={{ className: 'font-semibold text-base-content' }}
          >
            {m.nav_home()}
          </Link>
          <Link
            to="/photos"
            className={navLink}
            activeProps={{ className: 'font-semibold text-base-content' }}
          >
            {m.nav_photos()}
          </Link>
          <Link
            to="/about"
            className={navLink}
            activeProps={{ className: 'font-semibold text-base-content' }}
          >
            {m.nav_about()}
          </Link>
        </nav>
        <div className="ml-auto flex items-center">
          <LocaleSwitch />
          <ThemeSwitch />
          {/* No room on phones; the About page links the repo too */}
          <GitHubLink className="max-sm:hidden" />
        </div>
      </div>
    </header>
  )
}
