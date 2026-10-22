import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { thumbUrl } from '@/config/images'
import { downloadOriginals, originalLinks } from '@/lib/album/download'
import { indexAlbum, loadAlbum } from '@/lib/album/load'
import {
  MAX_DOWNLOAD,
  MAX_SELECTION,
  clearSelected,
  removeSelected,
} from '@/lib/album/selection'
import type { Selection } from '@/lib/album/selection'
import type { Photo } from '@/lib/album/types'
import { formatBytes, formatNumber, sentenceGap } from '@/lib/i18n'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime.js'

const DownloadIcon = () => (
  <svg
    className="size-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 15V3" />
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
  </svg>
)

/**
 * The selected photos' full records (file names, sizes) — the gallery only
 * has the current filter's photos, but the selection spans all of them.
 * The album is a cached static asset, so this costs one fetch per visit.
 */
const usePhotoIndex = (enabled: boolean) => {
  const [index, setIndex] = useState<Map<number, Photo>>()
  useEffect(() => {
    if (!enabled || index) return
    let live = true
    void loadAlbum().then(album => {
      if (live) setIndex(indexAlbum(album).photo)
    })
    return () => {
      live = false
    }
  }, [enabled, index])
  return index
}

/**
 * Fixed bottom bar while anything is selected: count and total size, the
 * selection as a strip of thumbnails (newest first; click to view, × to
 * remove), and the actions.
 */
export const SelectionTray = ({ selection }: { selection: Selection }) => {
  const locale = getLocale()
  const index = usePhotoIndex(selection.ids.length > 0)
  const [progress, setProgress] = useState<{ done: number; total: number }>()
  const [copied, setCopied] = useState(false)
  const abort = useRef<AbortController>(null)

  useEffect(() => () => abort.current?.abort(), [])

  // Publish the tray's height so fixed UI (back-to-top) can sit above it
  const trackHeight = useCallback((el: HTMLElement | null) => {
    if (!el) return
    const root = document.documentElement
    const observer = new ResizeObserver(() =>
      root.style.setProperty('--tray-height', `${el.offsetHeight}px`),
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--tray-height')
    }
  }, [])

  // A saved selection can outlive a photo (e.g. removed from the archive):
  // drop ids the album no longer has, so they don't hold one of the slots
  useEffect(() => {
    if (!index) return
    const unknown = selection.ids.filter(id => !index.has(id))
    if (unknown.length) removeSelected(unknown)
  }, [index, selection])
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const count = selection.ids.length
  if (!count) return null

  const photos = index
    ? selection.ids.flatMap(id => index.get(id) ?? [])
    : undefined
  const totalBytes = photos?.reduce((sum, p) => sum + p.size, 0)
  // Past the download limit only the links can be taken
  const canDownload = count <= MAX_DOWNLOAD

  const download = async () => {
    if (!photos?.length || !canDownload) return
    const controller = new AbortController()
    abort.current = controller
    setProgress({ done: 0, total: photos.length })
    await downloadOriginals(photos, {
      signal: controller.signal,
      onProgress: done => setProgress({ done, total: photos.length }),
    })
    setProgress(undefined)
  }

  const copyLinks = async () => {
    if (!photos) return
    try {
      await navigator.clipboard.writeText(originalLinks(photos))
      setCopied(true)
    } catch {
      window.prompt(m.selection_copy_links(), originalLinks(photos))
    }
  }

  return (
    <section
      ref={trackHeight}
      aria-label={m.selection_title()}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100/95 shadow-[0_-8px_24px_rgb(0_0_0/0.08)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-[96rem] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6 lg:px-8">
        <div className="flex shrink-0 items-baseline gap-2 lg:w-44 lg:flex-col lg:gap-0">
          <p className="font-semibold" aria-live="polite">
            {m.selection_count({
              count: formatNumber(count, locale),
              max: MAX_SELECTION,
            })}
          </p>
          {totalBytes !== undefined && (
            <p className="text-sm tabular-nums text-base-content/60">
              {formatBytes(totalBytes, locale)}
            </p>
          )}
        </div>

        <ul className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1">
          {[...selection.ids].reverse().map(id => (
            <li key={id} className="group relative shrink-0">
              <Link
                to="/photos/$id"
                params={{ id: String(id) }}
                className="block overflow-hidden rounded-md"
              >
                <img
                  src={thumbUrl(id)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-12 object-cover"
                  style={{ backgroundColor: index?.get(id)?.c }}
                />
              </Link>
              <button
                type="button"
                aria-label={m.selection_remove()}
                title={m.selection_remove()}
                onClick={() => removeSelected([id])}
                className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-base-content text-xs leading-none text-base-100 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {progress ? (
            <>
              <div className="flex flex-col">
                <span
                  className="text-sm font-medium tabular-nums"
                  aria-live="polite"
                >
                  {m.selection_downloading({
                    done: formatNumber(progress.done, locale),
                    total: formatNumber(progress.total, locale),
                  })}
                </span>
                {progress.total > 1 && (
                  <span className="text-xs text-base-content/55">
                    {m.selection_multi_hint()}
                  </span>
                )}
              </div>
              <progress
                className="progress progress-primary w-24"
                value={progress.done}
                max={progress.total}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm rounded-full"
                onClick={() => abort.current?.abort()}
              >
                {m.selection_stop()}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm rounded-full"
                onClick={clearSelected}
              >
                {m.selection_clear()}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm rounded-full"
                disabled={!photos}
                onClick={copyLinks}
              >
                {copied ? m.selection_links_copied() : m.selection_copy_links()}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-full"
                disabled={!photos || !canDownload}
                onClick={download}
              >
                <DownloadIcon />
                {m.selection_download({ count: formatNumber(count, locale) })}
              </button>
            </>
          )}
        </div>
      </div>
      {!canDownload && (
        <p
          aria-live="polite"
          className="mx-auto max-w-[96rem] px-4 pb-3 text-sm text-base-content/70 lg:px-8"
        >
          {m.selection_over_download({ download: MAX_DOWNLOAD })}
          {sentenceGap(locale)}
          <Link
            to="/about"
            hash="downloads"
            className="link font-medium text-primary"
          >
            {m.select_all_photos()}
          </Link>
        </p>
      )}
    </section>
  )
}
