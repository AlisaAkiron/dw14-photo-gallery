import { createIsomorphicFn } from '@tanstack/react-start'
import albumUrl from '@/data/album.json?url'
import type { Album, Photo, Photographer } from './types'

let clientAlbum: Promise<Album> | undefined

/**
 * The album metadata (~70 KB gzip). The server imports it into the Worker
 * bundle; the browser fetches it once as a content-hashed static asset —
 * cached forever, never part of the JS bundle — on the first client-side
 * navigation (SSR'd pages carry their own loader data).
 */
export const loadAlbum = createIsomorphicFn()
  .server(
    async () => (await import('@/data/album.json')).default as unknown as Album,
  )
  .client(() => {
    clientAlbum ??= fetch(albumUrl).then(response => {
      if (!response.ok) throw new Error(`album.json: HTTP ${response.status}`)
      return response.json() as Promise<Album>
    })
    // A failed fetch must not poison every later navigation
    clientAlbum.catch(() => {
      clientAlbum = undefined
    })
    return clientAlbum
  })

type AlbumIndex = {
  photo: Map<number, Photo>
  photographer: Map<number, Photographer>
}

const indexes = new WeakMap<Album, AlbumIndex>()

export const indexAlbum = (album: Album): AlbumIndex => {
  let index = indexes.get(album)
  if (!index) {
    index = {
      photo: new Map(album.photos.map(p => [p.id, p])),
      photographer: new Map(album.photographers.map(p => [p.id, p])),
    }
    indexes.set(album, index)
  }
  return index
}
