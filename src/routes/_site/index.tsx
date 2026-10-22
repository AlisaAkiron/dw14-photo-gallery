import { createFileRoute } from '@tanstack/react-router'
import { toGridPhoto } from '@/lib/album/grid'
import { indexAlbum, loadAlbum } from '@/lib/album/load'
import { DAY_KEYS, EVENT_DAYS, dayOf, hourOf } from '@/lib/album/time'
import { HomePage } from '@/pages/HomePage'
import type { HomeData } from '@/pages/HomePage'
import { m } from '@/paraglide/messages.js'

export const Route = createFileRoute('/_site/')({
  loader: async (): Promise<HomeData> => {
    const album = await loadAlbum()
    const { photo } = indexAlbum(album)

    // One histogram per event day over the event's common hour span, so
    // the days' bars line up.
    const counts = new Map<string, number>()
    let minHour = 23
    let maxHour = 0
    for (const p of album.photos) {
      const day = dayOf(p.t)
      if (day === 'other') continue
      const hour = hourOf(p.t)
      minHour = Math.min(minHour, hour)
      maxHour = Math.max(maxHour, hour)
      counts.set(`${day}/${hour}`, (counts.get(`${day}/${hour}`) ?? 0) + 1)
    }
    const days = EVENT_DAYS.map(day => {
      const hours = []
      for (let hour = minHour; hour <= maxHour; hour++) {
        hours.push({ hour, count: counts.get(`${day}/${hour}`) ?? 0 })
      }
      return { day, count: hours.reduce((n, h) => n + h.count, 0), hours }
    })
    const otherCount = album.photos.filter(p => dayOf(p.t) === 'other').length

    return {
      total: album.photos.length,
      dayCount: DAY_KEYS.length - 1,
      sets: album.sets.map(set => ({
        ...set,
        photo: toGridPhoto(photo.get(set.cover)!),
      })),
      photographers: album.photographers,
      days,
      otherCount,
    }
  },
  head: () => ({
    meta: [
      { title: `${m.site_title()} — ${m.site_subtitle()}` },
      { property: 'og:title', content: m.site_title() },
      { property: 'og:description', content: m.meta_description() },
      { property: 'og:type', content: 'website' },
    ],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return <HomePage data={Route.useLoaderData()} />
}
