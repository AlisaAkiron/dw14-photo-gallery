import type { Plugin } from 'vite'

const ID = 'virtual:react-scan'
const RESOLVED_ID = '\0' + ID

/**
 * `virtual:react-scan` — React Scan in `vite dev`, an empty module in
 * builds. src/client.tsx imports it before anything else: React Scan has
 * to install its DevTools hook before react-dom loads, so it can't be a
 * lazy import, and a plain static import guarded by `import.meta.env.DEV`
 * would still ship the package (it declares no `sideEffects: false`).
 */
export const reactScan = (): Plugin => {
  let dev = false
  return {
    name: 'dw14:react-scan',
    configResolved(config) {
      dev = config.command === 'serve'
    },
    resolveId(id) {
      if (id === ID) return RESOLVED_ID
    },
    load(id) {
      if (id !== RESOLVED_ID) return
      return dev
        ? // safeArea: keep the toolbar clear of the gallery's fixed
          // selection tray (≤ ~160 px tall) and the back-to-top button
          // stacked above it, both of which it would otherwise cover
          `import { scan } from 'react-scan'\nscan({ enabled: true, safeArea: { bottom: 240 } })\n`
        : 'export {}\n'
    },
  }
}
