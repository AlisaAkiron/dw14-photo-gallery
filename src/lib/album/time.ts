/**
 * Shoot times are camera-clock times read as China time (UTC+8, no DST) —
 * that's how the site showed them and how visitors remember the event, so
 * every day/hour bucket and every formatted time uses +08:00 regardless of
 * the viewer's own time zone.
 */
export const EVENT_TIME_ZONE = 'Asia/Shanghai'
const OFFSET_SECONDS = 8 * 3600

export const EVENT_DAYS = ['2026-08-21', '2026-08-22', '2026-08-23'] as const

/** An event day, or 'other' for the few stragglers outside it */
export type DayKey = (typeof EVENT_DAYS)[number] | 'other'
export const DAY_KEYS: readonly DayKey[] = [...EVENT_DAYS, 'other']

const shifted = (t: number) => new Date((t + OFFSET_SECONDS) * 1000)

export const dayOf = (t: number): DayKey => {
  const day = shifted(t).toISOString().slice(0, 10)
  return (EVENT_DAYS as readonly string[]).includes(day)
    ? (day as DayKey)
    : 'other'
}

export const hourOf = (t: number) => shifted(t).getUTCHours()

export const isDayKey = (value: unknown): value is DayKey =>
  typeof value === 'string' && (DAY_KEYS as readonly string[]).includes(value)

/** Noon on the event day, for formatting the day's label */
const dayTimestamp = (day: (typeof EVENT_DAYS)[number]) =>
  Date.parse(`${day}T12:00:00+08:00`)

const formatter = (locale: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { timeZone: EVENT_TIME_ZONE, ...options })

/** "Fri, Aug 21" / "8月21日周五" */
export const formatDay = (
  day: (typeof EVENT_DAYS)[number],
  locale: string,
  weekday: 'short' | 'long' = 'short',
) =>
  formatter(locale, { month: 'short', day: 'numeric', weekday }).format(
    dayTimestamp(day),
  )

/** Full shoot time with seconds, e.g. "Aug 21, 2026, 10:28:29" */
export const formatShootTime = (t: number, locale: string) =>
  formatter(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(t * 1000)

/** Date only, for descriptions */
export const formatDate = (t: number, locale: string) =>
  formatter(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(
    t * 1000,
  )

/** "10:00–11:00" — 24-hour everywhere, as the event schedule was */
export const formatHourRange = (hour: number) => `${hour}:00–${hour + 1}:00`
