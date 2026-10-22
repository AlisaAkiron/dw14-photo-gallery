import { createReadStream, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Plugin } from 'vite'

const ROOT = resolve(import.meta.dirname, '../.images')
const IMAGE_PREFIX = '/__local-images/'

const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
}

/**
 * Dev-only stand-in for the R2 bucket's public domain. `.images/` (written
 * by `pnpm images`) has exactly the bucket's key layout, and
 * VITE_IMAGE_BASE_URL points at `/__local-images` in .env.development.
 * Originals get `Content-Disposition: attachment`, which the bucket's
 * objects carry as upload metadata.
 */
export const localImages = (): Plugin => ({
  name: 'dw14:local-images',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (!url.pathname.startsWith(IMAGE_PREFIX)) return next()
      const key = decodeURIComponent(url.pathname.slice(IMAGE_PREFIX.length))

      const file = join(ROOT, key)
      if (!file.startsWith(ROOT + '/')) {
        res.statusCode = 400
        return res.end()
      }
      let size: number
      try {
        size = statSync(file).size
      } catch {
        res.statusCode = 404
        return res.end(`Not found: ${key} (run \`pnpm images\` first)`)
      }
      const ext = file.slice(file.lastIndexOf('.'))
      res.setHeader(
        'Content-Type',
        CONTENT_TYPES[ext] ?? 'application/octet-stream',
      )
      res.setHeader('Content-Length', size)
      // Like the bucket in production: without this, every row the grid
      // re-mounts while scrolling would re-download its thumbnails. A day
      // rather than forever, so re-rendered derivatives show up in dev.
      res.setHeader('Cache-Control', 'public, max-age=86400')
      if (key.startsWith('original/')) {
        res.setHeader('Content-Disposition', 'attachment')
      }
      createReadStream(file).pipe(res)
    })
  },
})
