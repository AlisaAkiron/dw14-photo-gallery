/**
 * Rebuilds archive/ — the set folders and photo_info.json that `pnpm images`,
 * `gen:data` and `gen:files` read — from the published originals, so anyone
 * can work on the site without a copy of the original archive:
 *
 *   node scripts/restore-archive.ts [<originals dir>] [--out <dir>]
 *     [--download-near-fifty-gigabyte-from-public-url]
 *
 * <originals dir> (default .images/original) holds originals under their
 * public file names, like the bucket's original/ prefix — e.g. a copy of it
 * made with rclone. Originals missing there are downloaded from the URLs in
 * public/files.json only with the download flag: the full set is ~48 GB.
 *
 * Every file must match its size and SHA-256 in public/files.json before it
 * is moved into place, and files already in the archive that match are kept,
 * so an interrupted run resumes. photo_info.json comes from
 * data/photo_info.json (committed by gen-data.ts).
 *
 * Every file's modified time is set to its shoot time from photo_info.json
 * (the EXIF time, or the upload time for the few photos without one), so the
 * archive is identical on every machine, timestamps included.
 */
import { createHash } from 'node:crypto'
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import type { ReadableStream } from 'node:stream/web'
import { pipeline } from 'node:stream/promises'
import { parseArgs } from 'node:util'

type FileEntry = {
  id: number
  name: string
  url: string
  size: number
  sha256: string
}

const DOWNLOAD_FLAG = 'download-near-fifty-gigabyte-from-public-url'
const USAGE = `usage: node scripts/restore-archive.ts [<originals dir>] [--out <dir>] [--${DOWNLOAD_FLAG}]`
const JOBS = 4
const ATTEMPTS = 3

const parse = () => {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        out: { type: 'string' },
        [DOWNLOAD_FLAG]: { type: 'boolean' },
      },
    })
  } catch (error) {
    // Unknown options are errors, so a mistyped download flag never
    // silently skips the download
    console.error(`${(error as Error).message}\n${USAGE}`)
    process.exit(1)
  }
}
const { values, positionals } = parse()

const root = resolve(import.meta.dirname, '..')
const sourceDir = resolve(positionals[0] ?? join(root, '.images/original'))
const outDir = resolve(values.out ?? join(root, 'archive'))
const download = values[DOWNLOAD_FLAG] ?? false

const manifest = readFileSync(join(root, 'data/photo_info.json'), 'utf8')
const { photos } = JSON.parse(manifest) as {
  photos: { path: string; photoId: number; shootTime: string }[]
}
const { files } = JSON.parse(
  readFileSync(join(root, 'public/files.json'), 'utf8'),
) as { files: FileEntry[] }

const pathOf = new Map(photos.map(p => [p.photoId, p.path]))
const shotAt = new Map(photos.map(p => [p.photoId, new Date(p.shootTime)]))
if (files.length !== photos.length || files.some(f => !pathOf.has(f.id))) {
  console.error(
    'public/files.json and data/photo_info.json list different photos — rerun gen:data and gen:files',
  )
  process.exit(1)
}

const sha256Of = async (path: string) => {
  const hash = createHash('sha256')
  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}

const isIntact = async (path: string, entry: FileEntry) =>
  existsSync(path) &&
  statSync(path).size === entry.size &&
  (await sha256Of(path)) === entry.sha256

/** Streams into `dest` through a temporary file, moved in only if it checks out */
const save = async (source: Readable, dest: string, entry: FileEntry) => {
  const part = `${dest}.part`
  const hash = createHash('sha256')
  let size = 0
  try {
    await pipeline(
      source,
      async function* (chunks: AsyncIterable<Buffer>) {
        for await (const chunk of chunks) {
          hash.update(chunk)
          size += chunk.length
          yield chunk
        }
      },
      createWriteStream(part),
    )
    const sha256 = hash.digest('hex')
    if (size !== entry.size || sha256 !== entry.sha256) {
      throw new Error(
        `${entry.name}: got ${size} bytes, sha256 ${sha256}; expected ${entry.size} bytes, sha256 ${entry.sha256}`,
      )
    }
    renameSync(part, dest)
  } catch (error) {
    rmSync(part, { force: true })
    throw error
  }
}

/** A 404 or 403 won't fix itself; rate limiting (429) and server errors might */
class FatalHttpError extends Error {}

const fetchTo = async (entry: FileEntry, dest: string) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(entry.url)
      if (!response.ok || !response.body) {
        const message = `${entry.url}: HTTP ${response.status}`
        const retry = response.status === 429 || response.status >= 500
        throw retry ? new Error(message) : new FatalHttpError(message)
      }
      await save(
        Readable.fromWeb(response.body as ReadableStream<Uint8Array>),
        dest,
        entry,
      )
      return
    } catch (error) {
      if (error instanceof FatalHttpError || attempt === ATTEMPTS) throw error
      await new Promise(done => setTimeout(done, 2000 * attempt))
    }
  }
}

type Outcome = 'kept' | 'copied' | 'downloaded' | 'missing'

const place = async (entry: FileEntry, dest: string): Promise<Outcome> => {
  if (await isIntact(dest, entry)) return 'kept'
  const local = join(sourceDir, entry.name)
  const copy = existsSync(local)
  if (!copy && !download) return 'missing'
  mkdirSync(dirname(dest), { recursive: true })
  if (copy) {
    await save(createReadStream(local), dest, entry)
    return 'copied'
  }
  await fetchTo(entry, dest)
  return 'downloaded'
}

const restore = async (entry: FileEntry) => {
  const dest = join(outDir, pathOf.get(entry.id)!)
  const outcome = await place(entry, dest)
  if (outcome !== 'missing') {
    const shot = shotAt.get(entry.id)!
    utimesSync(dest, shot, shot)
  }
  return outcome
}

mkdirSync(outDir, { recursive: true })
const manifestOut = join(outDir, 'photo_info.json')
if (!existsSync(manifestOut)) writeFileSync(manifestOut, manifest)
else if (readFileSync(manifestOut, 'utf8') !== manifest) {
  console.warn(`${manifestOut} differs from data/photo_info.json — left as is`)
}

const counts: Record<Outcome | 'failed', number> = {
  kept: 0,
  copied: 0,
  downloaded: 0,
  missing: 0,
  failed: 0,
}
let missingBytes = 0
let done = 0
const queue = [...files]

const worker = async () => {
  for (let entry = queue.shift(); entry; entry = queue.shift()) {
    try {
      const outcome = await restore(entry)
      counts[outcome]++
      if (outcome === 'missing') missingBytes += entry.size
    } catch (error) {
      counts.failed++
      console.error(`\n${String(error)}`)
    }
    if (++done % 25 === 0 || done === files.length) {
      process.stdout.write(`\r${done}/${files.length}`)
    }
  }
}

console.log(
  `Restoring ${files.length} originals into ${outDir} from ${sourceDir}` +
    (download ? ', downloading what is missing' : ''),
)
await Promise.all(Array.from({ length: JOBS }, worker))
console.log(
  `\n${counts.kept} already there, ${counts.copied} copied, ` +
    `${counts.downloaded} downloaded, ${counts.missing} missing, ${counts.failed} failed`,
)

if (counts.missing) {
  console.log(
    `${counts.missing} originals (${(missingBytes / 1e9).toFixed(1)} GB) are not in ${sourceDir}. ` +
      `Put them there, or rerun with --${DOWNLOAD_FLAG} to fetch them from the public URLs.`,
  )
}
if (counts.missing || counts.failed) process.exit(1)
console.log('Next: `pnpm images` renders .images/ from the restored archive.')
