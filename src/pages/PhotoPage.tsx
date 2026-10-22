import {
  Link,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { markLoaded } from '@/components/photo/PhotoThumb'
import { PhotoInfo } from '@/components/viewer/PhotoInfo'
import { thumbUrl, viewUrl } from '@/config/images'
import type { GallerySearch } from '@/lib/album/filters'
import type { Photo, Photographer } from '@/lib/album/types'
import { setViewerFocus } from '@/lib/album/viewer-focus'
import { setName } from '@/lib/i18n'
import { m } from '@/paraglide/messages.js'
import { cn } from '@/utils/cn'

type PhotoPageProps = {
  photo: Photo
  photographer: Photographer
  prevId?: number
  nextId?: number
  position: number
  total: number
  /** The gallery filters prev/next walk (may be wider than the URL's) */
  search: GallerySearch
}

const iconProps = {
  className: 'size-6',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const ChevronLeft = () => (
  <svg {...iconProps}>
    <path d="m15 18-6-6 6-6" />
  </svg>
)
const ChevronRight = () => (
  <svg {...iconProps}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)
const CloseIcon = () => (
  <svg {...iconProps}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)
const InfoIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
)

const SWIPE_DISTANCE = 50

/**
 * Full-screen viewer, always dark. ←/→ (or swipe) step through the list the
 * visitor came from without stacking history entries; Esc / close returns
 * to the gallery at the same scroll position.
 */
export const PhotoPage = ({
  photo,
  photographer,
  prevId,
  nextId,
  position,
  total,
  search,
}: PhotoPageProps) => {
  const router = useRouter()
  const navigate = useNavigate()
  const fromGallery = useLocation({ select: l => !!l.state.fromGallery })
  // Details: open by default beside the photo on wide screens, closed by
  // default (a bottom sheet) on narrow ones — two flags so SSR markup is
  // the same for both.
  const [infoOpenNarrow, setInfoOpenNarrow] = useState(false)
  const [infoHiddenWide, setInfoHiddenWide] = useState(false)

  const go = useCallback(
    (id: number | undefined) => {
      if (id === undefined) return
      void navigate({
        to: '/photos/$id',
        params: { id: String(id) },
        search,
        state: { fromGallery },
        replace: true,
        resetScroll: false,
      })
    },
    [navigate, search, fromGallery],
  )

  const close = useCallback(() => {
    setViewerFocus(photo.id)
    if (fromGallery) router.history.back()
    else void navigate({ to: '/photos', search })
  }, [photo.id, fromGallery, router, navigate, search])

  const toggleInfo = useCallback(() => {
    if (window.matchMedia('(min-width: 64rem)').matches) {
      setInfoHiddenWide(hidden => !hidden)
    } else {
      setInfoOpenNarrow(open => !open)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('input, select, textarea')
      )
        return
      if (e.key === 'ArrowLeft') go(prevId)
      else if (e.key === 'ArrowRight') go(nextId)
      else if (e.key === 'Escape') close()
      else if (e.key === 'i') toggleInfo()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [go, close, toggleInfo, prevId, nextId])

  // Warm the neighbours so stepping through is instant
  useEffect(() => {
    for (const id of [prevId, nextId]) {
      if (id !== undefined) new Image().src = viewUrl(id)
    }
  }, [prevId, nextId])

  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' && e.isPrimary) {
      swipeStart.current = { x: e.clientX, y: e.clientY }
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? nextId : prevId)
    }
  }

  const alt = m.viewer_photo_alt({
    photographer: photographer.name,
    set: setName(photo.set),
  })

  const navButton =
    'btn btn-circle btn-ghost bg-black/30 hover:bg-black/60 border-0'

  return (
    <div
      data-theme="dark"
      className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-neutral-100 lg:flex-row"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 p-2">
          <button
            type="button"
            className="btn btn-circle btn-ghost"
            aria-label={m.viewer_close()}
            onClick={close}
          >
            <CloseIcon />
          </button>
          <span className="text-sm tabular-nums text-white/70">
            {m.viewer_position({ index: position, total })}
          </span>
          <button
            type="button"
            className="btn btn-circle btn-ghost"
            aria-label={m.viewer_info()}
            onClick={toggleInfo}
          >
            <InfoIcon />
          </button>
        </div>

        {/* Stage */}
        <div
          className="relative min-h-0 flex-1 touch-pan-y touch-pinch-zoom select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipeStart.current = null)}
        >
          <img
            src={thumbUrl(photo.id)}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-contain px-2 pb-2 lg:px-16"
            draggable={false}
          />
          <img
            key={photo.id}
            ref={markLoaded}
            src={viewUrl(photo.id)}
            alt={alt}
            width={photo.w}
            height={photo.h}
            onLoad={e => {
              e.currentTarget.dataset.loaded = ''
            }}
            className="viewer-image absolute inset-0 size-full object-contain px-2 pb-2 lg:px-16"
            draggable={false}
          />
          {prevId !== undefined && (
            <Link
              to="/photos/$id"
              params={{ id: String(prevId) }}
              search={search}
              state={{ fromGallery }}
              replace
              resetScroll={false}
              aria-label={m.viewer_prev()}
              className={cn(
                navButton,
                'absolute top-1/2 left-2 -translate-y-1/2 max-sm:hidden',
              )}
            >
              <ChevronLeft />
            </Link>
          )}
          {nextId !== undefined && (
            <Link
              to="/photos/$id"
              params={{ id: String(nextId) }}
              search={search}
              state={{ fromGallery }}
              replace
              resetScroll={false}
              aria-label={m.viewer_next()}
              className={cn(
                navButton,
                'absolute top-1/2 right-2 -translate-y-1/2 max-sm:hidden',
              )}
            >
              <ChevronRight />
            </Link>
          )}
        </div>
        <p className="hidden pb-2 text-center text-xs text-white/40 lg:block">
          {m.viewer_keys_hint()}
        </p>
      </div>

      {/* Details */}
      <aside
        aria-label={m.viewer_info()}
        className={cn(
          'max-h-[50%] shrink-0 overflow-y-auto border-white/10 p-5',
          'border-t lg:max-h-none lg:w-80 lg:border-t-0 lg:border-l',
          infoOpenNarrow ? 'block' : 'hidden',
          infoHiddenWide ? 'lg:hidden' : 'lg:block',
        )}
      >
        <PhotoInfo photo={photo} photographer={photographer} />
      </aside>
    </div>
  )
}
