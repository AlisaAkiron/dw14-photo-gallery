/**
 * Builds src/data/album.json — the slim, UI-shaped metadata the site ships —
 * from the archive's photo_info.json.
 *
 *   node scripts/gen-data.ts [<album dir>]
 *
 * <album dir> defaults to archive/ (the reorganised alltuu download). The
 * output is committed: builds never see the archive. The archive's
 * photo_info.json is committed too, as data/photo_info.json, so
 * scripts/restore-archive.ts can rebuild the archive from the originals.
 *
 * Optional inputs, merged when present:
 * - exiftool on PATH: fills lens names and camera bodies the site's EXIF
 *   API didn't return (the JPEGs carry ~1,900 lens names the JSON lacks).
 * - .images/meta.json (written by `pnpm images`): dominant colour per
 *   photo, used as the grid placeholder while thumbnails load.
 */
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, resolve } from 'node:path'
import type {
  Album,
  CameraInfo,
  Photo,
  SetKey,
} from '../src/lib/album/types.ts'
import { SET_KEYS } from '../src/lib/album/types.ts'
import { downloadName, publicFileNames } from '../src/lib/album/files.ts'

type SourcePhoto = {
  path: string
  category: string
  originalFilename: string
  photographer: { name: string; userId: number }
  shootTime: string
  shootTimeSource: 'camera' | 'exif-no-camera' | 'upload-fallback'
  width: number
  height: number
  camera: {
    model: string | null
    lens: string | null
    focalLength: string | null
    fNumber: string | null
    exposure: string | null
    iso: string | null
  } | null
  photoId: number
}

type ExifRecord = {
  SourceFile: string
  Make?: string
  Model?: string
  LensModel?: string
  Lens?: string
}

const SET_BY_CATEGORY: Record<string, SetKey> = {
  图片直播: 'live',
  签名墙: 'signature-wall',
  官方常驻摄影点2: 'spot-2',
  官方常驻摄影点3: 'spot-3',
  IP团片: 'ip-group',
  大合照: 'group-photo',
  娃娃走秀: 'runway',
  舞台活动: 'stage',
}

// EXIF model codes → marketing names. Unknown bodies fall back to
// "<Make> <Model>" with the corporate suffixes trimmed.
const CAMERA_NAMES: Record<string, string> = {
  'NIKON Z 6_2': 'Nikon Z6II',
  'ILCE-6700': 'Sony α6700',
  'ILCE-7M4': 'Sony α7 IV',
  'ILCE-7RM5': 'Sony α7R V',
  'ILCE-7C': 'Sony α7C',
  'NIKON D7000': 'Nikon D7000',
  'Canon EOS R6m2': 'Canon EOS R6 Mark II',
}

// The site reports some shutter speeds as decimals (0.01) — show them the
// way cameras do (1/100).
const formatExposure = (value: string) => {
  const seconds = Number(value)
  if (value.includes('/') || !(seconds > 0 && seconds < 1)) return `${value}s`
  return `1/${Math.round(1 / seconds)}s`
}

const TIME_QUALITY = {
  camera: 'camera',
  'exif-no-camera': 'edited',
  'upload-fallback': 'upload',
} as const

const root = resolve(import.meta.dirname, '..')
const albumDir = resolve(process.argv[2] ?? join(root, 'archive'))
if (!existsSync(join(albumDir, 'photo_info.json'))) {
  console.error(
    `No photo_info.json in ${albumDir}\nusage: node scripts/gen-data.ts [<album dir>]`,
  )
  process.exit(1)
}
const info = JSON.parse(
  readFileSync(join(albumDir, 'photo_info.json'), 'utf8'),
) as { photos: SourcePhoto[] }

const readExif = (): Map<string, ExifRecord> => {
  try {
    const out = execFileSync(
      'exiftool',
      [
        '-j',
        '-q',
        '-fast2',
        '-r',
        '-ext',
        'jpg',
        '-charset',
        'filename=utf8',
        '-Make',
        '-Model',
        '-LensModel',
        '-Lens',
        '.',
      ],
      { cwd: albumDir, maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' },
    )
    const records = JSON.parse(out) as ExifRecord[]
    return new Map(records.map(r => [r.SourceFile.replace(/^\.\//, ''), r]))
  } catch (error) {
    console.warn('exiftool unavailable, skipping lens merge:', String(error))
    return new Map()
  }
}

const metaPath = join(root, '.images/meta.json')
const readColors = (): Record<string, string> => {
  if (!existsSync(metaPath)) {
    console.warn('.images/meta.json not found — no placeholder colours')
    return {}
  }
  const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as Record<
    string,
    { color: string }
  >
  return Object.fromEntries(
    Object.entries(meta).map(([id, { color }]) => [id, color]),
  )
}

const colors = readColors()

const exif = readExif()

const cameraName = (make?: string, model?: string | null) => {
  if (!model) return undefined
  if (CAMERA_NAMES[model]) return CAMERA_NAMES[model]
  const brand = make?.replace(/\s+(CORPORATION|Corporation|CO\.,LTD\.?)$/, '')
  if (!brand || model.toLowerCase().startsWith(brand.toLowerCase()))
    return model
  return `${brand} ${model}`
}

const toCamera = (p: SourcePhoto): CameraInfo | undefined => {
  const file = exif.get(p.path)
  const c = p.camera
  const camera: CameraInfo = {
    body: cameraName(file?.Make, c?.model ?? file?.Model),
    lens: c?.lens ?? file?.LensModel ?? file?.Lens,
    focal: c?.focalLength ? `${Number(c.focalLength)}mm` : undefined,
    aperture: c?.fNumber ? `ƒ/${Number(c.fNumber)}` : undefined,
    exposure: c?.exposure ? formatExposure(c.exposure) : undefined,
    iso: c?.iso ? Number(c.iso) : undefined,
  }
  const entries = Object.entries(camera).filter(([, v]) => v !== undefined)
  return entries.length
    ? (Object.fromEntries(entries) as CameraInfo)
    : undefined
}

const fileNames = publicFileNames(info.photos)

const photos: Photo[] = info.photos
  .map(p => {
    const set = SET_BY_CATEGORY[p.category]
    if (!set) throw new Error(`Unknown category ${p.category} (${p.path})`)
    // The archive names files <camera stem>_<photoId>.jpg; the site derives
    // the download filename from `name` + `id` the same way.
    if (basename(p.path) !== downloadName(p.originalFilename, p.photoId)) {
      throw new Error(`Unexpected archive filename ${p.path}`)
    }
    const photo: Photo = {
      id: p.photoId,
      set,
      by: p.photographer.userId,
      t: Math.floor(Date.parse(p.shootTime) / 1000),
      tq: TIME_QUALITY[p.shootTimeSource],
      w: p.width,
      h: p.height,
      name: p.originalFilename,
      size: statSync(join(albumDir, p.path)).size,
    }
    const file = fileNames.get(p.photoId)!
    if (file !== downloadName(p.originalFilename, p.photoId)) photo.file = file
    const color = colors[p.photoId]
    if (color) photo.c = color
    const camera = toCamera(p)
    if (camera) photo.cam = camera
    return photo
  })
  .sort((a, b) => a.t - b.t || a.id - b.id)

const countBy = <K>(key: (p: Photo) => K) => {
  const counts = new Map<K, number>()
  for (const p of photos) counts.set(key(p), (counts.get(key(p)) ?? 0) + 1)
  return counts
}

const photographerNames = new Map(
  info.photos.map(p => [p.photographer.userId, p.photographer.name]),
)
const photographers = [...countBy(p => p.by)]
  .map(([id, count]) => ({ id, name: photographerNames.get(id)!, count }))
  .sort((a, b) => b.count - a.count)

// Cover: the set's COVER_POSITION-th landscape photo in shoot order,
// counting round again from the start when the set has fewer (the 1000th of
// 400 is the 200th). Deterministic, and lands away from the middle, which
// gave spot-3 a cosplay cover rather than a kigurumi.
const COVER_POSITION = 1000

const coverOf = (set: SetKey) => {
  const inSet = photos.filter(p => p.set === set)
  const landscape = inSet.filter(p => p.w > p.h)
  const pool = landscape.length ? landscape : inSet
  return pool[(COVER_POSITION - 1) % pool.length]!.id
}

const setCounts = countBy(p => p.set)
const album: Album = {
  sets: SET_KEYS.map(key => ({
    key,
    count: setCounts.get(key) ?? 0,
    cover: coverOf(key),
  })),
  photographers,
  photos,
}

const outPath = join(root, 'src/data/album.json')
writeFileSync(outPath, JSON.stringify(album) + '\n')
console.log(
  `Wrote ${photos.length} photos, ${photographers.length} photographers → ${outPath}`,
)

// Byte-for-byte, so a restored archive is identical to this one
const manifestPath = join(root, 'data/photo_info.json')
copyFileSync(join(albumDir, 'photo_info.json'), manifestPath)
console.log(`Copied photo_info.json → ${manifestPath}`)
