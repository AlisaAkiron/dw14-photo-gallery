import { useEffect, useState } from 'react'
import { m } from '@/paraglide/messages.js'
import { cn } from '@/utils/cn'

/**
 * Floating "back to top", shown once the page is scrolled past one screen.
 * Sits above the gallery's selection tray, which publishes its height as
 * --tray-height on the root.
 */
export const BackToTop = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    // Same-value updates bail out, so scrolling doesn't re-render this
    const update = () => {
      frame = 0
      setVisible(window.scrollY > window.innerHeight)
    }
    const onScroll = () => {
      frame ||= requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      aria-label={m.back_to_top()}
      title={m.back_to_top()}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={scrollToTop}
      className={cn(
        'btn btn-circle fixed right-4 z-40 border-base-300 bg-base-100 shadow-lg transition-all duration-200 lg:right-8',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0',
      )}
      style={{ bottom: 'calc(var(--tray-height, 0px) + 1rem)' }}
    >
      <svg
        className="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m5 12 7-7 7 7" />
        <path d="M12 19V5" />
      </svg>
    </button>
  )
}
