/**
 * Shape of src/data/album.json (written by scripts/gen-data.ts). Kept free
 * of runtime imports so the Node script can load it with type stripping.
 */

/** Photo sets, in display order (the archive's folder numbering). */
export const SET_KEYS = [
  'live',
  'signature-wall',
  'spot-2',
  'spot-3',
  'ip-group',
  'group-photo',
  'runway',
  'stage',
] as const

export type SetKey = (typeof SET_KEYS)[number]

/**
 * How far the shoot time can be trusted:
 * - camera: straight from the camera's EXIF
 * - edited: exported/edited file — may be the export time
 * - upload: no shoot time at all; ≈ when it was uploaded
 */
export type TimeQuality = 'camera' | 'edited' | 'upload'

export type CameraInfo = {
  body?: string
  lens?: string
  focal?: string
  aperture?: string
  exposure?: string
  iso?: number
}

export type Photo = {
  /** alltuu photoId — also the R2 object name */
  id: number
  set: SetKey
  /** Photographer userId */
  by: number
  /** Shoot time, unix seconds (camera clock, read as China time) */
  t: number
  tq: TimeQuality
  /** Original pixel size */
  w: number
  h: number
  /** Dominant colour (#rrggbb), placeholder while the thumbnail loads */
  c?: string
  /** Original camera filename, e.g. _DSC5177.JPG */
  name: string
  /**
   * Public filename of the original, only when it isn't the default
   * `<stem>_<id>.jpg` (names with Chinese or spaces, made URL-safe — see
   * publicFileNames). Use photoFileName() rather than reading this.
   */
  file?: string
  /** Original file size in bytes */
  size: number
  cam?: CameraInfo
}

/** The subset of a photo the gallery grid needs. */
export type GridPhoto = Pick<Photo, 'id' | 'set' | 'by' | 't' | 'w' | 'h' | 'c'>

export type PhotoSet = {
  key: SetKey
  count: number
  /** photoId of the set's cover */
  cover: number
}

export type Photographer = {
  /** alltuu userId */
  id: number
  name: string
  count: number
}

export type Album = {
  sets: PhotoSet[]
  /** By photo count, descending */
  photographers: Photographer[]
  /** By shoot time, ascending */
  photos: Photo[]
}
