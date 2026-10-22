import type { Photo } from './types'

/**
 * Archive filename for a photo: the camera stem plus the photoId, which
 * keeps two photographers' `DSC_0001.JPG` apart.
 */
export const downloadName = (name: string, id: number) =>
  `${stemOf(name)}_${id}.jpg`

const stemOf = (name: string) => name.replace(/\.[^.]*$/, '')

/** The public filename of a photo's original — its R2 key under original/ */
export const photoFileName = (photo: Pick<Photo, 'id' | 'name' | 'file'>) =>
  photo.file ?? downloadName(photo.name, photo.id)

const URL_SAFE = /^[A-Za-z0-9._-]+$/

/**
 * Chinese suffixes photo software appended to file names, in the English
 * the same software uses (Lightroom names these "-Edit" and
 * "-Enhanced-NR"), plus one hand-named file.
 */
const TRANSLATIONS: [RegExp, string][] = [
  [/已增强/g, 'Enhanced'],
  [/降噪/g, 'NR'],
  [/编辑/g, 'Edit'],
  [/大合照/g, 'group-photo'],
]

/** Windows Explorer's copy suffix: "X - 副本", "X - 副本 (2)" */
const COPY_SUFFIX = /\s*-\s*副本(?:\s*[(（](\d+)[)）])?$/

/**
 * URL-safe public filenames (`<stem>_<photoId>.jpg`) for every photo, so
 * originals can be served straight from the bucket under their own names.
 * Already-safe names are kept as they are. Otherwise:
 * - a Windows copy suffix is dropped when no photo has the plain name, and
 *   becomes -copy / -copy-<n> when one does (it's genuinely a second file);
 * - Chinese editor suffixes are translated (see TRANSLATIONS);
 * - anything still unsafe becomes "-".
 */
export const publicFileNames = (
  photos: { originalFilename: string; photoId: number }[],
) => {
  const stems = new Set(photos.map(p => stemOf(p.originalFilename)))
  const names = new Map<number, string>()

  for (const { originalFilename, photoId } of photos) {
    let stem = stemOf(originalFilename)
    if (!URL_SAFE.test(stem)) {
      const copy = COPY_SUFFIX.exec(stem)
      if (copy) {
        const base = stem.slice(0, copy.index)
        stem = stems.has(base)
          ? `${base}-copy${copy[1] ? `-${copy[1]}` : ''}`
          : base
      }
      for (const [pattern, english] of TRANSLATIONS) {
        stem = stem.replace(pattern, `-${english}`)
      }
      stem = stem
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')
    }
    const name = `${stem}_${photoId}.jpg`
    if (!URL_SAFE.test(name)) throw new Error(`Unsafe file name ${name}`)
    names.set(photoId, name)
  }
  return names
}
