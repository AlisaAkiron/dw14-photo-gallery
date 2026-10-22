import type { SetKey } from '@/lib/album/types'
import { m } from '@/paraglide/messages.js'
import type { Locale } from '@/paraglide/runtime.js'

/** Each language's own name, as shown in the switcher */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  ja: '日本語',
}

const SET_MESSAGES: Record<SetKey, { name: () => string; desc: () => string }> =
  {
    live: { name: m.set_live, desc: m.set_live_desc },
    'signature-wall': {
      name: m.set_signature_wall,
      desc: m.set_signature_wall_desc,
    },
    'spot-2': { name: m.set_spot_2, desc: m.set_spot_2_desc },
    'spot-3': { name: m.set_spot_3, desc: m.set_spot_3_desc },
    'ip-group': { name: m.set_ip_group, desc: m.set_ip_group_desc },
    'group-photo': { name: m.set_group_photo, desc: m.set_group_photo_desc },
    runway: { name: m.set_runway, desc: m.set_runway_desc },
    stage: { name: m.set_stage, desc: m.set_stage_desc },
  }

export const setName = (key: SetKey) => SET_MESSAGES[key].name()
export const setDescription = (key: SetKey) => SET_MESSAGES[key].desc()

/** "15.7 MB" / "1.24 GB" in the active locale's number format */
export const formatBytes = (bytes: number, locale: Locale) =>
  bytes >= 1e9
    ? new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'gigabyte',
        maximumFractionDigits: 2,
      }).format(bytes / 1e9)
    : new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'megabyte',
        maximumFractionDigits: 1,
      }).format(bytes / 1e6)

export const formatNumber = (n: number, locale: Locale) =>
  new Intl.NumberFormat(locale).format(n)
