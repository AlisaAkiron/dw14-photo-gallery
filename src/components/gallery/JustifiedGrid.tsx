import { Link } from '@tanstack/react-router'
import {
  defaultRangeExtractor,
  useWindowVirtualizer,
} from '@tanstack/react-virtual'
import type { Range, Virtualizer } from '@tanstack/react-virtual'
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { PhotoThumb } from '@/components/photo/PhotoThumb'
import type { GallerySearch } from '@/lib/album/filters'
import { layoutGrid } from '@/lib/album/layout'
import type { GridRow } from '@/lib/album/layout'
import { formatDay, formatHourRange } from '@/lib/album/time'
import type { GridPhoto } from '@/lib/album/types'
import type { Selection } from '@/lib/album/selection'
import { takeViewerFocus } from '@/lib/album/viewer-focus'
import { setName } from '@/lib/i18n'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime.js'
import { cn } from '@/utils/cn'

const HEADER_HEIGHT = 44

/**
 * Rows mounted beyond the viewport, in screen heights. Thumbnails start
 * loading when their row mounts, so mounting far ahead in the scroll
 * direction is what keeps a fast fling from outrunning the images; behind,
 * a little is kept for small reversals.
 */
const LOOKAHEAD_SCREENS = 2
const LOOKBEHIND_SCREENS = 0.5

/**
 * Above this speed (screen heights per second) the visitor is flinging, not
 * looking. On a slow network, loading everything flown past queues hundreds
 * of thumbnails ahead of the ones where the fling lands, so rows mounting
 * during a fling only load while the network keeps up (see
 * MAX_PENDING_THUMBS); the rest show their placeholder colour until the
 * fling slows below this speed, when every mounted row — including the
 * lookahead — starts loading.
 */
const FLING_SCREENS_PER_SECOND = 4
/**
 * Backpressure during a fling: a newly mounted row still loads if fewer
 * than this many thumbnails (about a screenful) are in flight. A fast
 * connection never reaches it, so it never shows placeholders; a slow one
 * stops queuing as soon as it falls behind.
 */
const MAX_PENDING_THUMBS = 24

/** Grid thumbnails requested but not loaded yet (mounted ones only) */
const pendingThumbs = () =>
  document.querySelectorAll('.photo-thumb img[src]:not([data-loaded])').length
/** Velocity is measured over windows at least this long */
const VELOCITY_WINDOW_MS = 50

const sizing = (width: number) =>
  width < 640
    ? { targetHeight: 120, gap: 3 }
    : width < 1024
      ? { targetHeight: 180, gap: 4 }
      : { targetHeight: 230, gap: 6 }

// Last measured width, so a grid remounted by client-side navigation (e.g.
// back from the viewer) lays out on its first render — before the router
// restores the scroll position into it. Zero until the first measurement,
// which keeps the hydration render identical to SSR (no width on the
// server, so no rows).
let lastWidth = 0

const useContainerWidth = (ref: React.RefObject<HTMLElement | null>) => {
  const [width, setWidth] = useState(lastWidth)
  useLayoutEffect(() => {
    const el = ref.current!
    const update = () => {
      lastWidth = el.clientWidth
      setWidth(el.clientWidth)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

type JustifiedGridProps = {
  photos: GridPhoto[]
  search: GallerySearch
  photographerNames: Map<number, string>
  selection: Selection
  /** Multi-select mode: a click on a photo toggles it instead of opening it */
  selecting: boolean
  /** At the selection limit: unselected photos can't be picked */
  selectionFull: boolean
  onToggle: (id: number, range: boolean) => void
}

/**
 * Justified photo rows grouped under day/hour headers, virtualized against
 * the window scroll — the unfiltered album is ~700 rows.
 */
export const JustifiedGrid = ({
  photos,
  search,
  photographerNames,
  selection,
  selecting,
  selectionFull,
  onToggle,
}: JustifiedGridProps) => {
  const listRef = useRef<HTMLDivElement>(null)
  const width = useContainerWidth(listRef)
  const [scrollMargin, setScrollMargin] = useState(0)

  const rows = useMemo(
    () =>
      layoutGrid(photos, {
        width,
        headerHeight: HEADER_HEIGHT,
        ...sizing(width),
      }),
    [photos, width],
  )
  const { gap } = sizing(width)

  // Directional overscan, in rows: far ahead in the scroll direction (both
  // ways while idle), little behind
  const virtualizerRef = useRef<Virtualizer<Window, Element>>(null)
  const rangeExtractor = useCallback(
    (range: Range) => {
      const screenRows = Math.ceil(
        window.innerHeight / sizing(width).targetHeight,
      )
      const ahead = Math.ceil(screenRows * LOOKAHEAD_SCREENS)
      const behind = Math.ceil(screenRows * LOOKBEHIND_SCREENS)
      const direction = virtualizerRef.current?.scrollDirection
      return defaultRangeExtractor({
        ...range,
        overscan: 0,
        startIndex: Math.max(
          0,
          range.startIndex - (direction === 'forward' ? behind : ahead),
        ),
        endIndex: Math.min(
          range.count - 1,
          range.endIndex + (direction === 'backward' ? behind : ahead),
        ),
      })
    },
    [width],
  )

  const [flinging, setFlinging] = useState(false)
  const velocitySample = useRef<{ offset: number; time: number } | null>(null)
  const trackVelocity = (instance: Virtualizer<Window, Element>) => {
    if (!instance.isScrolling) {
      velocitySample.current = null
      setFlinging(false)
      return
    }
    const offset = instance.scrollOffset ?? 0
    const time = performance.now()
    const prev = velocitySample.current
    if (!prev) {
      velocitySample.current = { offset, time }
      return
    }
    if (time - prev.time < VELOCITY_WINDOW_MS) return
    velocitySample.current = { offset, time }
    const speed = (Math.abs(offset - prev.offset) / (time - prev.time)) * 1000
    // Same value bails out of rendering, so this is cheap per scroll event
    setFlinging(speed > FLING_SCREENS_PER_SECOND * window.innerHeight)
  }

  // The React Compiler isn't used here, so its memoization caveat for
  // TanStack Virtual doesn't apply
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: i => rows[i]!.height + (rows[i]!.kind === 'photos' ? gap : 0),
    getItemKey: i => rows[i]!.key,
    rangeExtractor,
    scrollMargin,
    onChange: trackVelocity,
  })
  virtualizerRef.current = virtualizer

  // Sizes are computed, never measured: re-read them whenever the layout
  // changes (row keys survive a resize, but their heights don't)
  useLayoutEffect(() => {
    virtualizer.measure()
  }, [rows, virtualizer])

  // The filter bar above can change height (hour chips appear)
  useLayoutEffect(() => {
    const el = listRef.current!
    setScrollMargin(el.getBoundingClientRect().top + window.scrollY)
  }, [rows])

  // Back from the viewer: make sure the last viewed photo is on screen
  const pendingFocus = useRef(takeViewerFocus())
  useEffect(() => {
    const id = pendingFocus.current
    if (id === undefined || !rows.length) return
    pendingFocus.current = undefined
    const index = rows.findIndex(
      row => row.kind === 'photos' && row.items.some(i => i.photo.id === id),
    )
    if (index < 0) return
    // After the router's scroll restoration has run
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-photo-id="${id}"]`)
        const rect = el?.getBoundingClientRect()
        if (rect && rect.top >= 64 && rect.bottom <= window.innerHeight) return
        virtualizer.scrollToIndex(index, { align: 'center' })
      }),
    )
  }, [rows, virtualizer])

  const locale = getLocale()

  return (
    <div
      ref={listRef}
      className="relative w-full"
      style={{ height: width ? virtualizer.getTotalSize() : '100vh' }}
    >
      {virtualizer.getVirtualItems().map(item => {
        const row = rows[item.index]!
        return (
          <div
            key={item.key}
            className="absolute top-0 left-0 w-full"
            style={{
              height: item.size,
              transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            {row.kind === 'header' ? (
              <RowHeader row={row} locale={locale} />
            ) : (
              <PhotoRow
                row={row}
                load={!flinging}
                gap={gap}
                search={search}
                photographerNames={photographerNames}
                selection={selection}
                selecting={selecting}
                selectionFull={selectionFull}
                onToggle={onToggle}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/*
 * Rows are memoized: the virtualizer re-renders the grid on every scroll
 * frame, but a row's content only depends on its (stable) layout object,
 * so only rows that just mounted actually render.
 */
const CheckIcon = () => (
  <svg
    className="size-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const PhotoRow = memo(function PhotoRow({
  row,
  load,
  gap,
  search,
  photographerNames,
  selection,
  selecting,
  selectionFull,
  onToggle,
}: {
  row: Extract<GridRow, { kind: 'photos' }>
  /** false while flinging; a row that has started loading never stops */
  load: boolean
  gap: number
  search: GallerySearch
  photographerNames: Map<number, string>
  selection: Selection
  selecting: boolean
  selectionFull: boolean
  onToggle: (id: number, range: boolean) => void
}) {
  const [armed, setArmed] = useState(
    () => load || pendingThumbs() < MAX_PENDING_THUMBS,
  )
  if (load && !armed) setArmed(true)

  return (
    <div className="flex" style={{ gap, height: row.height }}>
      {row.items.map(({ photo, width }) => {
        const selected = selection.has(photo.id)
        const blocked = selecting && selectionFull && !selected
        return (
          // The check is a sibling of the link, not inside it: a button
          // inside a link isn't valid HTML
          <div
            key={photo.id}
            className={cn(
              'group/tile relative flex-none overflow-hidden rounded-sm transition-colors',
              selected && 'bg-primary/15 ring-2 ring-primary ring-inset',
            )}
            style={{ width }}
          >
            <Link
              to="/photos/$id"
              params={{ id: String(photo.id) }}
              search={search}
              state={{ fromGallery: true }}
              data-photo-id={photo.id}
              // In multi-select mode the link acts as a toggle; its name
              // stays the photo's description (the image alt)
              aria-pressed={selecting ? selected : undefined}
              aria-disabled={blocked || undefined}
              onClick={e => {
                if (!selecting) return
                e.preventDefault()
                onToggle(photo.id, e.shiftKey)
              }}
              className={cn(
                'block size-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                blocked && 'cursor-not-allowed',
              )}
            >
              <PhotoThumb
                photo={photo}
                alt={m.viewer_photo_alt({
                  photographer: photographerNames.get(photo.by) ?? '',
                  set: setName(photo.set),
                })}
                // The virtualizer already limits what's mounted; native
                // lazy loading would only add another deferral on top
                loading="eager"
                load={armed}
                className={cn(
                  'size-full transition-transform duration-200',
                  selected
                    ? 'scale-[0.86] rounded-sm'
                    : !selecting && 'hover:scale-[1.03]',
                )}
              />
            </Link>
            {/* Indicator only: in multi-select mode the whole photo is the
                toggle; outside it, selected photos stay marked */}
            {(selecting || selected) && (
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full border-2 shadow-sm transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-content'
                    : blocked
                      ? 'border-white/40 bg-black/20 text-transparent'
                      : 'border-white/90 bg-black/30 text-transparent group-hover/tile:bg-black/50',
                )}
              >
                <CheckIcon />
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
})

const RowHeader = memo(function RowHeader({
  row,
  locale,
}: {
  row: Extract<GridRow, { kind: 'header' }>
  locale: string
}) {
  return (
    <div className="flex h-full items-end justify-between gap-3 pb-2">
      <h3 className="text-sm font-semibold">
        {row.day === 'other' ? (
          m.day_other()
        ) : (
          <>
            {formatDay(row.day, locale)}
            <span className="ml-2 font-normal tabular-nums text-base-content/70">
              {formatHourRange(row.hour!)}
            </span>
          </>
        )}
      </h3>
      <span className="text-xs text-base-content/50">
        {m.photo_count({ count: row.count })}
      </span>
    </div>
  )
})
