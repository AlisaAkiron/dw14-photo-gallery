import { originalUrl } from '@/config/images'
import { photoFileName } from './files'
import type { Photo } from './types'

/** Browsers drop downloads started in quick succession */
const GAP_MS = 600

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>(resolve => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })

/**
 * Downloads originals one by one, as ordinary browser downloads: the
 * bucket serves them with Content-Disposition: attachment, so nothing is
 * buffered or zipped in the page. (The `download` attribute only applies
 * same-origin — in dev; in production the header names the file.)
 */
export const downloadOriginals = async (
  photos: Photo[],
  {
    signal,
    onProgress,
  }: { signal: AbortSignal; onProgress: (done: number) => void },
) => {
  for (const [i, photo] of photos.entries()) {
    if (signal.aborted) return
    const a = document.createElement('a')
    a.href = originalUrl(photo)
    a.download = photoFileName(photo)
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    onProgress(i + 1)
    if (i < photos.length - 1) await wait(GAP_MS, signal)
  }
}

/** Absolute original URLs, one per line — for a download manager or wget -i */
export const originalLinks = (photos: Photo[]) =>
  photos.map(p => new URL(originalUrl(p), window.location.href).href).join('\n')
