import { createFileRoute, notFound } from '@tanstack/react-router'
import { NotFound } from '@/components/shared/NotFound'
import { absoluteUrl, viewUrl } from '@/config/images'
import { filterPhotos, validateGallerySearch } from '@/lib/album/filters'
import type { GallerySearch } from '@/lib/album/filters'
import { indexAlbum, loadAlbum } from '@/lib/album/load'
import { formatDate } from '@/lib/album/time'
import { setName } from '@/lib/i18n'
import { PhotoPage } from '@/pages/PhotoPage'
import { m } from '@/paraglide/messages.js'
import { getLocale, getUrlOrigin } from '@/paraglide/runtime.js'

const VIEW_SIZE = 2048

export const Route = createFileRoute('/photos/$id')({
  // The gallery's filters ride along so prev/next walk the same list
  validateSearch: validateGallerySearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const album = await loadAlbum()
    const index = indexAlbum(album)
    const id = Number(params.id)
    const photo = index.photo.get(id)
    if (!photo) throw notFound()

    let search: GallerySearch = deps
    let list = filterPhotos(album.photos, search)
    let position = list.findIndex(p => p.id === id)
    // A shared link with filters that don't include this photo: fall back
    // to browsing the whole album
    if (position < 0) {
      search = deps.sort ? { sort: deps.sort } : {}
      list = filterPhotos(album.photos, search)
      position = list.findIndex(p => p.id === id)
    }

    return {
      photo,
      photographer: index.photographer.get(photo.by)!,
      prevId: list[position - 1]?.id,
      nextId: list[position + 1]?.id,
      position: position + 1,
      total: list.length,
      search,
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { photo, photographer } = loaderData
    const title = `${setName(photo.set)} · ${photographer.name} — ${m.site_title()}`
    const description = m.photo_meta_description({
      photographer: photographer.name,
      set: setName(photo.set),
      date: formatDate(photo.t, getLocale()),
    })
    const scale = Math.min(1, VIEW_SIZE / Math.max(photo.w, photo.h))
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'article' },
        {
          property: 'og:image',
          content: absoluteUrl(viewUrl(photo.id), getUrlOrigin()),
        },
        { property: 'og:image:type', content: 'image/webp' },
        {
          property: 'og:image:width',
          content: String(Math.round(photo.w * scale)),
        },
        {
          property: 'og:image:height',
          content: String(Math.round(photo.h * scale)),
        },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
    }
  },
  notFoundComponent: () => <NotFound message={m.photo_not_found_body()} />,
  component: RouteComponent,
})

function RouteComponent() {
  return <PhotoPage {...Route.useLoaderData()} />
}
