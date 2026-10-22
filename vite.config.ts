import { cloudflare } from '@cloudflare/vite-plugin'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { localImages } from './vite/local-images.ts'
import { reactScan } from './vite/react-scan.ts'
import { urlPatterns } from './vite/url-patterns.ts'

export default defineConfig({
  plugins: [
    // Must come before cloudflare(): its middleware has to see image and
    // original-download requests before they reach the Worker.
    localImages(),
    reactScan(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    react(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      outputStructure: 'message-modules',
      cookieName: 'DW14_LOCALE',
      // URL first; '/' (no locale prefix) falls through to the visitor's
      // last choice, then their browser language — and the middleware
      // redirects to that locale's prefix.
      strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale'],
      urlPatterns,
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    // Thousands of photos the dev server never needs to watch
    watch: { ignored: ['**/archive/**', '**/.images/**'] },
  },
  build: {
    // Never base64-inline small woff2 subsets into CSS — the font CSS
    // relies on unicode-range so browsers fetch only the chunks a page
    // actually renders; inlining would ship them all upfront.
    assetsInlineLimit: (filePath: string) =>
      filePath.endsWith('.woff2') ? false : undefined,
  },
})
