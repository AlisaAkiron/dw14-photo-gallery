import type { GallerySearch } from '@/lib/album/filters'
import { formatDay, formatHourRange } from '@/lib/album/time'
import type { Photographer } from '@/lib/album/types'
import { setName } from '@/lib/i18n'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime.js'

/** "Signature Wall · 糊氩 · Sat, Aug 22 · 14:00–15:00", or "All photos" */
export const galleryTitle = (
  search: GallerySearch,
  photographers: Photographer[],
) => {
  const parts: string[] = []
  if (search.set) parts.push(setName(search.set))
  if (search.by) {
    const name = photographers.find(p => p.id === search.by)?.name
    if (name) parts.push(name)
  }
  if (search.day) {
    parts.push(
      search.day === 'other'
        ? m.day_other()
        : formatDay(search.day, getLocale()),
    )
  }
  if (search.hour !== undefined) parts.push(formatHourRange(search.hour))
  return parts.length ? parts.join(' · ') : m.gallery_title_all()
}
