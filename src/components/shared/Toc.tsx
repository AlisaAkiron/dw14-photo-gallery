import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { m } from '@/paraglide/messages.js'
import { cn } from '@/utils/cn'

export type TocEntry = { id: string; title: string }

/** Headings crossing above this viewport line count as "being read" */
const READING_LINE_PX = 120

/**
 * id of the section currently being read. Scroll-driven and rAF-throttled;
 * state only changes when the section does, so the ToC doesn't re-render
 * per scroll frame.
 */
const useActiveHeading = (entries: TocEntry[]) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  // Keyed on the ids, not the array, which callers rebuild every render
  const ids = entries.map(entry => entry.id).join(' ')

  useEffect(() => {
    const headings = ids
      .split(' ')
      .map(id => document.getElementById(id))
      .filter(el => el !== null)

    let frame = 0
    const update = () => {
      frame = 0
      let active: string | null = null
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > READING_LINE_PX) break
        active = heading.id
      }
      setActiveId(active)
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [ids])

  return activeId
}

/**
 * Glides to the section (like BackToTop) and records it in the address bar
 * without a history entry. Goes through the router: it patches
 * history.replaceState and would answer a bare hash change with an instant
 * scrollIntoView, cutting the smooth scroll short.
 */
const useJumpTo = () => {
  const navigate = useNavigate()
  return (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    void navigate({
      to: '.',
      hash: id,
      replace: true,
      resetScroll: false,
      hashScrollIntoView: { behavior: reduceMotion ? 'auto' : 'smooth' },
    })
  }
}

/** Sticky sidebar with the current section marked; for wide screens */
export const TocSidebar = ({ entries }: { entries: TocEntry[] }) => {
  const activeId = useActiveHeading(entries)
  const jumpTo = useJumpTo()
  const navRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState<{
    top: number
    height: number
  } | null>(null)

  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>(
      `a[href="#${CSS.escape(activeId ?? '')}"]`,
    )
    setIndicator(
      active ? { top: active.offsetTop, height: active.offsetHeight } : null,
    )
  }, [activeId])

  return (
    <nav
      ref={navRef}
      aria-label={m.toc_title()}
      className="relative border-l border-base-300 pl-4"
    >
      <span
        aria-hidden
        className={cn(
          'absolute -left-px w-0.5 rounded-full bg-primary transition-all duration-300 ease-out',
          indicator ? 'opacity-100' : 'opacity-0',
        )}
        style={indicator ?? undefined}
      />
      <p className="mb-2 text-sm font-semibold text-base-content/60">
        {m.toc_title()}
      </p>
      {entries.map(entry => (
        <a
          key={entry.id}
          href={`#${entry.id}`}
          aria-current={entry.id === activeId ? 'location' : undefined}
          onClick={e => jumpTo(e, entry.id)}
          className={cn(
            'block py-1 text-sm transition-colors duration-300',
            entry.id === activeId
              ? 'font-medium text-primary'
              : 'text-base-content/60 hover:text-base-content',
          )}
        >
          {entry.title}
        </a>
      ))}
    </nav>
  )
}

/** Plain list under the page's intro; for screens without the sidebar */
export const TocInline = ({
  entries,
  className,
}: {
  entries: TocEntry[]
  className?: string
}) => {
  const jumpTo = useJumpTo()
  return (
    <nav
      aria-label={m.toc_title()}
      className={cn('rounded-box border border-base-300 p-4', className)}
    >
      <p className="mb-2 text-sm font-semibold text-base-content/60">
        {m.toc_title()}
      </p>
      <ol className="grid gap-x-6 sm:grid-cols-2">
        {entries.map(entry => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              onClick={e => jumpTo(e, entry.id)}
              className="block py-1 text-sm text-base-content/80 hover:text-primary"
            >
              {entry.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
