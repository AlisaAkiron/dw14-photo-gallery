import type { GridPhoto } from './types'
import { dayOf, hourOf } from './time'
import type { DayKey } from './time'

export type GridItem = { photo: GridPhoto; width: number }

export type GridRow =
  | {
      kind: 'header'
      key: string
      day: DayKey
      /** undefined for the 'other' day, which isn't split by hour */
      hour?: number
      count: number
      height: number
    }
  | { kind: 'photos'; key: string; items: GridItem[]; height: number }

type LayoutOptions = {
  width: number
  targetHeight: number
  gap: number
  headerHeight: number
}

/**
 * Justified rows (Flickr-style): photos keep their aspect ratio and each
 * row is scaled to fill the container width exactly. Photos are grouped
 * by day + hour under a header row, so a visitor scrolling the timeline
 * always sees when they're looking at.
 *
 * Photos must already be in display order.
 */
export const layoutGrid = (
  photos: GridPhoto[],
  { width, targetHeight, gap, headerHeight }: LayoutOptions,
): GridRow[] => {
  const rows: GridRow[] = []
  if (width <= 0) return rows

  let group: GridPhoto[] = []
  let groupKey: string | undefined

  const flushGroup = () => {
    if (!group.length) return
    const first = group[0]!
    const day = dayOf(first.t)
    rows.push({
      kind: 'header',
      key: `h-${groupKey}`,
      day,
      hour: day === 'other' ? undefined : hourOf(first.t),
      count: group.length,
      height: headerHeight,
    })

    let row: GridPhoto[] = []
    let aspectSum = 0
    const pushRow = (height: number) => {
      rows.push({
        kind: 'photos',
        key: `r-${row[0]!.id}`,
        items: row.map(photo => ({
          photo,
          width: (photo.w / photo.h) * height,
        })),
        height,
      })
      row = []
      aspectSum = 0
    }

    for (const photo of group) {
      row.push(photo)
      aspectSum += photo.w / photo.h
      const naturalWidth = aspectSum * targetHeight + gap * (row.length - 1)
      if (naturalWidth >= width) {
        pushRow((width - gap * (row.length - 1)) / aspectSum)
      }
    }
    // The last row keeps the target height instead of being stretched
    if (row.length) pushRow(targetHeight)
    group = []
  }

  for (const photo of photos) {
    const day = dayOf(photo.t)
    const key = day === 'other' ? day : `${day}-${hourOf(photo.t)}`
    if (key !== groupKey) {
      flushGroup()
      groupKey = key
    }
    group.push(photo)
  }
  flushGroup()
  return rows
}
