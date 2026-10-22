/**
 * Renders the link-preview image for pages that aren't a single photo, one
 * per language, from messages/<locale>.json's site_title and site_subtitle:
 *
 *   public/og/<locale>.png    1200 × 630
 *
 *   node scripts/gen-og.ts
 *
 * The output is committed; rerun after changing the title or subtitle.
 * Text is drawn with the fonts installed on this machine (librsvg goes
 * through fontconfig), so MiSans, MiSans TC and Noto Sans CJK JP must be
 * installed — the same faces the site uses per language (see
 * src/styles/tailwind.css).
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import sharp from 'sharp'

const ROOT = resolve(import.meta.dirname, '..')
const OUT_DIR = join(ROOT, 'public/og')

const WIDTH = 1200
const HEIGHT = 630

// The light theme's ground, text and primary red
const BACKGROUND = '#ffffff'
const TEXT = '#1f1a1b'
const RED = '#c8414c'

// The title is Latin, so always MiSans; the subtitle's face follows the
// language (MiSans would draw kanji in Chinese glyph forms)
const TITLE_FONT = 'MiSans'
const SUBTITLE_FONTS: Record<string, string> = {
  en: 'MiSans',
  'zh-Hans': 'MiSans',
  'zh-Hant': 'MiSans TC',
  ja: 'Noto Sans CJK JP',
}

const { locales } = JSON.parse(
  readFileSync(join(ROOT, 'project.inlang/settings.json'), 'utf8'),
) as { locales: string[] }

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const render = (title: string, subtitle: string, font: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="100%" height="100%" fill="${BACKGROUND}"/>
  <rect x="96" y="214" width="12" height="202" fill="${RED}"/>
  <text x="148" y="318" font-family="${TITLE_FONT}" font-size="104" font-weight="700" fill="${TEXT}">${escapeXml(title)}</text>
  <text x="152" y="408" font-family="${font}" font-size="60" font-weight="500" fill="${RED}">${escapeXml(subtitle)}</text>
</svg>`

mkdirSync(OUT_DIR, { recursive: true })
for (const locale of locales) {
  const font = SUBTITLE_FONTS[locale]
  if (!font) throw new Error(`No font for ${locale}`)
  const messages = JSON.parse(
    readFileSync(join(ROOT, `messages/${locale}.json`), 'utf8'),
  ) as Record<string, string>
  const svg = render(messages.site_title!, messages.site_subtitle!, font)
  const out = join(OUT_DIR, `${locale}.png`)
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: true })
    .toFile(out)
  console.log(out)
}
