/**
 * Cloudflare list prices in USD, for the About page's cost table
 * (developers.cloudflare.com/r2/pricing and /workers/platform/pricing,
 * checked October 2026). The Workers Paid plan's $5 a month is left out.
 */
export const PRICES_CHECKED = '2026-10'

export const R2 = {
  freeGb: 10,
  perGbMonth: 0.015,
  /** Class B: reads (GetObject, HeadObject) */
  freeReads: 10e6,
  perMillionReads: 0.36,
  /** Class A: writes (PutObject, ListObjects…) */
  freeWrites: 1e6,
  perMillionWrites: 4.5,
}

export const WORKERS = {
  freeRequests: 10e6,
  perMillionRequests: 0.3,
  freeCpuMs: 30e6,
  perMillionCpuMs: 0.02,
}

/** thumb/ + view/ as written by `pnpm images` — stored next to the originals */
export const DERIVATIVE_BYTES = 711_762_472

/** Objects uploaded: a thumbnail, a viewer image and an original per photo, plus files.json */
export const objectCount = (photos: number) => photos * 3 + 1
