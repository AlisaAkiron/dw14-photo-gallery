/**
 * Renders the web derivatives of every archive photo into .images/, laid out
 * exactly like the R2 bucket so the folder can be synced as-is:
 *
 *   .images/thumb/<id>.webp     grid thumbnail, long side 640 px
 *   .images/view/<id>.webp      viewer image, long side 2048 px
 *   .images/original/<name>     relative symlink to the archive file, under
 *                               its public name (<stem>_<id>.jpg, URL-safe —
 *                               see publicFileNames); served as-is with
 *                               Content-Disposition: attachment
 *   .images/meta.json           { [id]: { color } } for gen-data.ts
 *
 *   node scripts/build-images.ts [<album dir>] [--limit N] [--jobs N]
 *
 * <album dir> defaults to archive/ (the reorganised alltuu download).
 *
 * Resumable: photos whose outputs and meta entry already exist are skipped.
 * Nothing is uploaded: syncing .images/ to R2 is done by hand.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { availableParallelism } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'
import { publicFileNames } from '../src/lib/album/files.ts'

const VIEW_SIZE = 2048
const THUMB_SIZE = 640
const VIEW_QUALITY = 80
const THUMB_QUALITY = 72

type Meta = Record<string, { color: string }>

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    limit: { type: 'string' },
    jobs: { type: 'string' },
  },
})

const USAGE =
  'usage: node scripts/build-images.ts [<album dir>] [--limit N] [--jobs N]'

const albumDir = resolve(
  positionals[0] ?? resolve(import.meta.dirname, '../archive'),
)
if (!existsSync(join(albumDir, 'photo_info.json'))) {
  console.error(`No photo_info.json in ${albumDir}\n${USAGE}`)
  process.exit(1)
}

// A typo like `--jobs x` would otherwise start no workers and report success
const count = (name: string, value: string | undefined, min: number) => {
  if (value === undefined) return undefined
  const n = Number(value)
  if (!Number.isInteger(n) || n < min) {
    console.error(
      `--${name} must be an integer ≥ ${min} (got ${value})\n${USAGE}`,
    )
    process.exit(1)
  }
  return n
}
const limit = count('limit', values.limit, 0)

const out = resolve(import.meta.dirname, '../.images')
for (const dir of ['thumb', 'view', 'original']) {
  mkdirSync(join(out, dir), { recursive: true })
}

const metaPath = join(out, 'meta.json')
const meta: Meta = existsSync(metaPath)
  ? (JSON.parse(readFileSync(metaPath, 'utf8')) as Meta)
  : {}

const { photos } = JSON.parse(
  readFileSync(join(albumDir, 'photo_info.json'), 'utf8'),
) as { photos: { path: string; photoId: number; originalFilename: string }[] }

const todo = photos
  .filter(
    p =>
      !meta[p.photoId] ||
      !existsSync(join(out, 'thumb', `${p.photoId}.webp`)) ||
      !existsSync(join(out, 'view', `${p.photoId}.webp`)),
  )
  .slice(0, limit)

// Each photo already decodes on libvips' thread pool; a handful of photos in
// flight keeps every core busy without holding dozens of 60 MP decodes in RAM.
const jobs =
  count('jobs', values.jobs, 1) ?? Math.max(2, availableParallelism() >> 1)
sharp.concurrency(2)

const hex = (n: number) => n.toString(16).padStart(2, '0')

const render = async ({ path, photoId }: { path: string; photoId: number }) => {
  const source = resolve(albumDir, path)
  // One decode (with JPEG shrink-on-load) to the view size; the thumbnail
  // is downscaled from that buffer rather than decoding the original twice.
  const { data, info } = await sharp(source)
    .rotate()
    .resize(VIEW_SIZE, VIEW_SIZE, { fit: 'inside', withoutEnlargement: true })
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true })
  const raw = {
    raw: { width: info.width, height: info.height, channels: info.channels },
  }

  await sharp(data, raw)
    .webp({ quality: VIEW_QUALITY, effort: 5 })
    .toFile(join(out, 'view', `${photoId}.webp`))
  const thumb = await sharp(data, raw)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside' })
    .webp({ quality: THUMB_QUALITY, effort: 5 })
    .toBuffer()
  writeFileSync(join(out, 'thumb', `${photoId}.webp`), thumb)

  const { dominant } = await sharp(thumb).stats()
  meta[photoId] = {
    color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
  }
}

// Originals are linked, not rendered: (re)create every link that's missing
// or broken (e.g. after the archive moved), whether or not the photo needs
// rendering. Relative, so the links survive moving the project folder.
const fileNames = publicFileNames(photos)
let linked = 0
for (const { path, photoId } of photos) {
  const link = join(out, 'original', fileNames.get(photoId)!)
  if (existsSync(link)) continue // follows the link: false when broken
  rmSync(link, { force: true })
  symlinkSync(relative(dirname(link), resolve(albumDir, path)), link)
  linked++
}
// Anything else in original/ is stale (an older naming) and would be
// uploaded to the bucket by a sync
const expected = new Set(fileNames.values())
const stale = readdirSync(join(out, 'original')).filter(f => !expected.has(f))
for (const f of stale) rmSync(join(out, 'original', f))
if (linked || stale.length) {
  console.log(`Linked ${linked} originals, removed ${stale.length} stale links`)
}

let done = 0
let failed = 0
const started = Date.now()
const queue = [...todo]

const worker = async () => {
  for (let photo = queue.shift(); photo; photo = queue.shift()) {
    try {
      await render(photo)
    } catch (error) {
      failed++
      console.error(`\n${photo.path}: ${String(error)}`)
    }
    done++
    if (done % 25 === 0 || done === todo.length) {
      // Checkpoint so an interrupted run resumes where it stopped
      writeFileSync(metaPath, JSON.stringify(meta))
      const rate = done / ((Date.now() - started) / 1000)
      process.stdout.write(
        `\r${done}/${todo.length} (${rate.toFixed(1)}/s, ${failed} failed)`,
      )
    }
  }
}

console.log(`${photos.length} photos, ${todo.length} to render, ${jobs} jobs`)
await Promise.all(Array.from({ length: jobs }, worker))
writeFileSync(metaPath, JSON.stringify(meta))
console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(0)}s`)
if (failed) process.exit(1)
