import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FilterBar } from '@/components/gallery/FilterBar'
import { JustifiedGrid } from '@/components/gallery/JustifiedGrid'
import { SelectionTray } from '@/components/gallery/SelectionTray'
import type { Facets, GallerySearch } from '@/lib/album/filters'
import {
  MAX_SELECTION,
  addSelected,
  toggleSelected,
  useSelection,
} from '@/lib/album/selection'
import type { GridPhoto, Photographer } from '@/lib/album/types'
import { setDescription } from '@/lib/i18n'
import { galleryTitle } from '@/lib/i18n/titles'
import { m } from '@/paraglide/messages.js'
import { cn } from '@/utils/cn'

type GalleryPageProps = {
  photos: GridPhoto[]
  facets: Facets
  photographers: Photographer[]
  search: GallerySearch
}

export const GalleryPage = ({
  photos,
  facets,
  photographers,
  search,
}: GalleryPageProps) => {
  const photographerNames = useMemo(
    () => new Map(photographers.map(p => [p.id, p.name])),
    [photographers],
  )

  // The selection itself is global and persistent (lib/album/selection);
  // multi-select mode only changes what a click on a photo does — and only
  // in it can photos be selected here
  const selection = useSelection()
  const [selecting, setSelecting] = useState(false)
  const lastToggled = useRef<number>(undefined)

  // Esc leaves multi-select mode (the selection itself stays)
  useEffect(() => {
    if (!selecting) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelecting(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selecting])

  // Stable while scrolling, so the memoized grid rows don't re-render
  const onToggle = useCallback(
    (id: number, range: boolean) => {
      const from = photos.findIndex(p => p.id === lastToggled.current)
      const to = photos.findIndex(p => p.id === id)
      if (range && from >= 0 && to >= 0) {
        // Shift-click: select everything between, in display order
        const [start, end] = from < to ? [from, to] : [to, from]
        addSelected(photos.slice(start, end + 1).map(p => p.id))
      } else {
        toggleSelected(id)
      }
      lastToggled.current = id
    },
    [photos],
  )

  const full = selection.ids.length >= MAX_SELECTION

  return (
    <div
      className={cn(
        'mx-auto max-w-[96rem] px-4 pb-12 lg:px-8',
        // Room for the selection tray over the end of the grid
        selection.ids.length > 0 && 'pb-48 lg:pb-32',
      )}
    >
      <header className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {galleryTitle(search, photographers)}
          </h1>
          <p className="mt-1 text-base-content/60">
            {search.set && `${setDescription(search.set)} · `}
            {m.photo_count({ count: photos.length })}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-full border border-base-300 py-1.5 pr-4 pl-2 text-sm font-medium select-none">
          <input
            type="checkbox"
            role="switch"
            aria-checked={selecting}
            className="toggle toggle-primary toggle-sm"
            checked={selecting}
            onChange={e => setSelecting(e.target.checked)}
          />
          {m.select_mode()}
        </label>
      </header>

      <FilterBar
        search={search}
        facets={facets}
        photographers={photographers}
      />

      {selecting && (
        <p
          aria-live="polite"
          className={cn(
            'mt-4 rounded-box px-4 py-2.5 text-sm',
            full
              ? 'bg-warning/15 text-base-content'
              : 'bg-primary/8 text-base-content/75',
          )}
        >
          {full
            ? m.selection_full({ max: MAX_SELECTION })
            : m.select_hint({ max: MAX_SELECTION })}
        </p>
      )}

      <div className="mt-4">
        {photos.length ? (
          <JustifiedGrid
            photos={photos}
            search={search}
            photographerNames={photographerNames}
            selection={selection}
            selecting={selecting}
            selectionFull={full}
            onToggle={onToggle}
          />
        ) : (
          <p className="py-24 text-center text-base-content/60">
            {m.gallery_empty()}
          </p>
        )}
      </div>

      <SelectionTray selection={selection} />
    </div>
  )
}
