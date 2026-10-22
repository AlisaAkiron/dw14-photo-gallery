import type { Photo, SetKey } from './types'
import { SET_KEYS } from './types'
import type { DayKey } from './time'
import { dayOf, hourOf, isDayKey } from './time'

/**
 * Gallery filters — the /photos search params. The photo viewer carries the
 * same params so prev/next walk the list the visitor came from.
 */
export type GallerySearch = {
  set?: SetKey
  /** Photographer userId */
  by?: number
  day?: DayKey
  /** Hour of day (China time); only meaningful together with a day */
  hour?: number
  sort?: 'newest'
}

const isSetKey = (value: unknown): value is SetKey =>
  typeof value === 'string' && (SET_KEYS as readonly string[]).includes(value)

const toInt = (value: unknown) => {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isInteger(n) ? n : undefined
}

/** Drops anything unknown or malformed instead of failing the route. */
export const validateGallerySearch = (
  search: Record<string, unknown>,
): GallerySearch => {
  const result: GallerySearch = {}
  if (isSetKey(search.set)) result.set = search.set
  const by = toInt(search.by)
  if (by !== undefined) result.by = by
  if (isDayKey(search.day)) {
    result.day = search.day
    const hour = toInt(search.hour)
    if (search.day !== 'other' && hour !== undefined && hour >= 0 && hour < 24)
      result.hour = hour
  }
  if (search.sort === 'newest') result.sort = 'newest'
  return result
}

type Dimension = 'set' | 'by' | 'day' | 'hour'

const matches = (photo: Photo, f: GallerySearch, skip?: Dimension) =>
  (skip === 'set' || !f.set || photo.set === f.set) &&
  (skip === 'by' || !f.by || photo.by === f.by) &&
  (skip === 'day' || !f.day || dayOf(photo.t) === f.day) &&
  (skip === 'hour' || f.hour === undefined || hourOf(photo.t) === f.hour)

/** Photos matching every filter, in the requested order. */
export const filterPhotos = (photos: Photo[], f: GallerySearch) => {
  const result = photos.filter(p => matches(p, f))
  return f.sort === 'newest' ? result.reverse() : result
}

export type Facets = {
  set: Partial<Record<SetKey, number>>
  by: Record<number, number>
  day: Partial<Record<DayKey, number>>
  hour: Record<number, number>
}

/**
 * Per-option counts. Each dimension is counted against all the *other*
 * filters, so its options show how many photos picking them would give.
 */
export const computeFacets = (photos: Photo[], f: GallerySearch): Facets => {
  const facets: Facets = { set: {}, by: {}, day: {}, hour: {} }
  const bump = <K extends PropertyKey>(
    rec: Partial<Record<K, number>>,
    k: K,
  ) => {
    rec[k] = (rec[k] ?? 0) + 1
  }
  for (const p of photos) {
    if (matches(p, f, 'set')) bump(facets.set, p.set)
    if (matches(p, f, 'by')) bump(facets.by, p.by)
    if (matches(p, f, 'day')) bump(facets.day, dayOf(p.t))
    if (f.day && f.day !== 'other' && matches(p, f, 'hour'))
      bump(facets.hour, hourOf(p.t))
  }
  return facets
}

export const hasFilters = (f: GallerySearch) =>
  !!(f.set || f.by || f.day || f.hour !== undefined)
