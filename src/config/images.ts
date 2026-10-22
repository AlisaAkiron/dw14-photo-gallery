import { photoFileName } from '@/lib/album/files'
import type { Photo } from '@/lib/album/types'

/**
 * Image URLs, all on the R2 bucket's public domain (in dev: the
 * local-images plugin serving .images/). Key layout is the one
 * scripts/build-images.ts writes.
 */
const IMAGE_BASE = import.meta.env.VITE_IMAGE_BASE_URL.replace(/\/$/, '')

/** Long side 640 px */
export const thumbUrl = (id: number) => `${IMAGE_BASE}/thumb/${id}.webp`

/** Long side 2048 px */
export const viewUrl = (id: number) => `${IMAGE_BASE}/view/${id}.webp`

/**
 * The original JPEG, under its public file name. Objects carry
 * Content-Disposition: attachment (set at upload), so the browser
 * downloads it named after the URL — the `download` attribute alone can't
 * do that across origins.
 */
export const originalUrl = (photo: Pick<Photo, 'id' | 'name' | 'file'>) =>
  `${IMAGE_BASE}/original/${photoFileName(photo)}`

/** For og:image, which must be absolute even when IMAGE_BASE is a path */
export const absoluteUrl = (url: string, origin: string) =>
  new URL(url, origin).href
