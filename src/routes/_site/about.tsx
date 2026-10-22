import { createFileRoute } from '@tanstack/react-router'
import { loadAlbum } from '@/lib/album/load'
import { AboutPage } from '@/pages/AboutPage'
import type { AboutData } from '@/pages/AboutPage'
import { m } from '@/paraglide/messages.js'

export const Route = createFileRoute('/_site/about')({
  loader: async (): Promise<AboutData> => {
    const album = await loadAlbum()
    const timeQuality = (tq: string) =>
      album.photos.filter(p => p.tq === tq).length
    return {
      total: album.photos.length,
      edited: timeQuality('edited'),
      upload: timeQuality('upload'),
      originalBytes: album.photos.reduce((sum, p) => sum + p.size, 0),
      sets: album.sets.map(({ key, count }) => ({ key, count })),
      photographers: album.photographers,
    }
  },
  head: () => ({
    meta: [
      { title: `${m.about_title()} — ${m.site_title()}` },
      { property: 'og:title', content: m.about_title() },
      { property: 'og:description', content: m.about_lead() },
    ],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return <AboutPage data={Route.useLoaderData()} />
}
