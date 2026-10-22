import { createFileRoute } from '@tanstack/react-router'
import {
  computeFacets,
  filterPhotos,
  validateGallerySearch,
} from '@/lib/album/filters'
import { toGridPhoto } from '@/lib/album/grid'
import { indexAlbum, loadAlbum } from '@/lib/album/load'
import { galleryTitle } from '@/lib/i18n/titles'
import { GalleryPage } from '@/pages/GalleryPage'
import { m } from '@/paraglide/messages.js'

export const Route = createFileRoute('/_site/photos/')({
  validateSearch: validateGallerySearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const album = await loadAlbum()
    const { photographer } = indexAlbum(album)
    // An unknown photographer id would silently show nothing
    const search =
      deps.by && !photographer.has(deps.by) ? { ...deps, by: undefined } : deps
    return {
      photos: filterPhotos(album.photos, search).map(toGridPhoto),
      facets: computeFacets(album.photos, search),
      photographers: album.photographers,
    }
  },
  head: ({ loaderData, match }) => {
    const title = galleryTitle(match.search, loaderData?.photographers ?? [])
    return {
      meta: [
        { title: `${title} — ${m.site_title()}` },
        { property: 'og:title', content: `${title} — ${m.site_title()}` },
        { property: 'og:description', content: m.meta_description() },
      ],
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  return <GalleryPage {...data} search={search} />
}
