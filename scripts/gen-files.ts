/**
 * Builds public/files.json — every original's download URL, size and
 * SHA-256, for download managers and for checking downloads — from
 * src/data/album.json and the archive's JPEGs.
 *
 *   node scripts/gen-files.ts [<album dir>]
 *
 * <album dir> defaults to archive/ (the reorganised alltuu download). Run
 * after `pnpm gen:data`. The output is committed and served by the site at
 * /files.json; URLs point at VITE_IMAGE_BASE_URL from .env.production.
 * An identical copy goes to .images/files.json, for the bucket root (so the
 * bucket describes itself without the site; uploaded by hand).
 *
 * Hashes are cached in .images/hashes.json by size + mtime, so only new or
 * changed files are read again (the full archive is ~48 GB).
 */
import { createHash } from 'node:crypto'
import {
  createReadStream,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { availableParallelism } from 'node:os'
import { join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { Album, SetKey } from '../src/lib/album/types.ts'
import { photoFileName } from '../src/lib/album/files.ts'

type FileEntry = {
  id: number
  /** Public file name — the URL's last segment, and the download name */
  name: string
  url: string
  size: number
  sha256: string
  set: SetKey
  photographer: string
}

type HashCache = Record<
  string,
  { size: number; mtimeMs: number; sha256: string }
>

const root = resolve(import.meta.dirname, '..')
const albumDir = resolve(process.argv[2] ?? join(root, 'archive'))
if (!existsSync(join(albumDir, 'photo_info.json'))) {
  console.error(
    `No photo_info.json in ${albumDir}\nusage: node scripts/gen-files.ts [<album dir>]`,
  )
  process.exit(1)
}

process.loadEnvFile(join(root, '.env.production'))
const base = process.env.VITE_IMAGE_BASE_URL?.replace(/\/$/, '')
if (!base || !/^https:\/\//.test(base)) {
  console.error(
    `VITE_IMAGE_BASE_URL in .env.production must be absolute (got ${base})`,
  )
  process.exit(1)
}

const album = JSON.parse(
  readFileSync(join(root, 'src/data/album.json'), 'utf8'),
) as Album
const { photos: sources } = JSON.parse(
  readFileSync(join(albumDir, 'photo_info.json'), 'utf8'),
) as { photos: { path: string; photoId: number }[] }
const pathOf = new Map(sources.map(p => [p.photoId, join(albumDir, p.path)]))
const photographerName = new Map(album.photographers.map(p => [p.id, p.name]))

const cachePath = join(root, '.images/hashes.json')
const cache: HashCache = existsSync(cachePath)
  ? (JSON.parse(readFileSync(cachePath, 'utf8')) as HashCache)
  : {}

// Files finish in any order, and ids this large keep insertion order in an
// object, so sort them: the same archive then always gives the same file
const writeCache = () =>
  writeFileSync(
    cachePath,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(cache).sort(([a], [b]) => Number(a) - Number(b)),
      ),
    ),
  )

const sha256Of = async (path: string) => {
  const hash = createHash('sha256')
  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}

const hashed = new Map<number, string>()
const queue = [...album.photos]
let read = 0
const started = Date.now()

const worker = async () => {
  for (let photo = queue.shift(); photo; photo = queue.shift()) {
    const path = pathOf.get(photo.id)
    if (!path) throw new Error(`Photo ${photo.id} is not in the archive`)
    const { size, mtimeMs } = statSync(path)
    // album.json records the size too — a mismatch means it's stale
    if (size !== photo.size) {
      throw new Error(
        `${path}: ${size} bytes, album.json says ${photo.size} — rerun gen:data`,
      )
    }
    const cached = cache[photo.id]
    if (cached?.size === size && cached.mtimeMs === mtimeMs) {
      hashed.set(photo.id, cached.sha256)
      continue
    }
    const sha256 = await sha256Of(path)
    cache[photo.id] = { size, mtimeMs, sha256 }
    hashed.set(photo.id, sha256)
    if (++read % 50 === 0) {
      writeCache()
      process.stdout.write(`\rHashed ${read} files`)
    }
  }
}

// Disk-bound: a few reads in flight is enough to saturate an SSD
await Promise.all(
  Array.from({ length: Math.min(8, availableParallelism()) }, worker),
)
writeCache()
if (read) {
  console.log(
    `\rHashed ${read} files in ${((Date.now() - started) / 1000).toFixed(0)}s`,
  )
}

const files: FileEntry[] = album.photos.map(photo => {
  const name = photoFileName(photo)
  return {
    id: photo.id,
    name,
    url: `${base}/original/${name}`,
    size: photo.size,
    sha256: hashed.get(photo.id)!,
    set: photo.set,
    photographer: photographerName.get(photo.by)!,
  }
})

// One file per line: readable, greppable, and diffs stay small
const head = JSON.stringify({
  count: files.length,
  size: files.reduce((sum, f) => sum + f.size, 0),
})
const json = `${head.slice(0, -1)},"files":[\n${files.map(f => JSON.stringify(f)).join(',\n')}\n]}\n`
for (const outPath of [
  join(root, 'public/files.json'),
  join(root, '.images/files.json'),
]) {
  writeFileSync(outPath, json)
  console.log(`Wrote ${files.length} files → ${outPath}`)
}
