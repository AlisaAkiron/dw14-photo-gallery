import logoRed from '@/assets/brand/dw-logo-red.webp'
import logoWhite from '@/assets/brand/dw-logo-white.webp'
import { cn } from '@/utils/cn'

const ALT = 'Doll Weekend'
const size = { width: 500, height: 166 }

/**
 * The official DOLL WEEKEND wordmark: red on the light theme, white on the
 * dark one — switched in CSS, so SSR markup doesn't depend on the theme
 * (display: none also hides the inactive one from screen readers).
 */
export const DwLogo = ({ className }: { className?: string }) => (
  <>
    <img
      src={logoRed}
      alt={ALT}
      {...size}
      className={cn('w-auto dark:hidden', className)}
    />
    <img
      src={logoWhite}
      alt={ALT}
      {...size}
      className={cn('hidden w-auto dark:block', className)}
    />
  </>
)
