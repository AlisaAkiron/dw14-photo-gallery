import { Link } from '@tanstack/react-router'
import { PhotoThumb } from '@/components/photo/PhotoThumb'
import { formatDay, formatHourRange } from '@/lib/album/time'
import type { EVENT_DAYS } from '@/lib/album/time'
import type { GridPhoto, Photographer, PhotoSet } from '@/lib/album/types'
import { formatNumber, setDescription, setName } from '@/lib/i18n'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime.js'

type DaySummary = {
  day: (typeof EVENT_DAYS)[number]
  count: number
  hours: { hour: number; count: number }[]
}

export type HomeData = {
  total: number
  dayCount: number
  sets: (PhotoSet & { photo: GridPhoto })[]
  photographers: Photographer[]
  days: DaySummary[]
  otherCount: number
}

const SectionTitle = ({
  children,
  body,
}: {
  children: React.ReactNode
  body?: string
}) => (
  <div className="mb-6 max-w-2xl">
    <h2 className="text-2xl font-bold">{children}</h2>
    {body && <p className="mt-1 text-base-content/65">{body}</p>}
  </div>
)

export const HomePage = ({ data }: { data: HomeData }) => {
  const locale = getLocale()
  const stats = [
    { value: data.total, label: m.stat_photos() },
    { value: data.photographers.length, label: m.stat_photographers() },
    { value: data.sets.length, label: m.stat_sets() },
    { value: data.dayCount, label: m.stat_days() },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-8">
      {/* Intro */}
      <section className="grid gap-8 py-10 lg:grid-cols-[1fr_auto] lg:items-end lg:py-14">
        <div>
          <p className="text-sm font-medium text-primary">
            {m.event_dates()} · {m.event_venue()}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            {m.site_title()}
            <span className="block text-2xl font-normal text-base-content/45 sm:text-3xl">
              {m.site_subtitle()}
            </span>
          </h1>
          <p className="mt-5 max-w-prose leading-relaxed text-base-content/75">
            {m.home_intro()}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/photos" className="btn btn-primary rounded-full px-6">
              {m.home_cta()}
            </Link>
            <a href="#find" className="btn btn-ghost rounded-full px-6">
              {m.home_find_title()} ↓
            </a>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-base-300 lg:mb-1">
          {stats.map(({ value, label }) => (
            <div
              key={label}
              className="flex flex-col-reverse sm:px-4 sm:first:pl-0 sm:last:pr-0"
            >
              <dt className="text-xs text-base-content/55">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {formatNumber(value, locale)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Find yourself: a bar per hour of each day */}
      <section
        id="find"
        className="scroll-mt-24 border-t border-base-300 pt-10"
      >
        <SectionTitle body={m.home_find_body()}>
          {m.home_find_title()}
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {data.days.map(day => (
            <DayCard key={day.day} summary={day} locale={locale} />
          ))}
        </div>
        {data.otherCount > 0 && (
          <Link
            to="/photos"
            search={{ day: 'other' }}
            className="link link-hover mt-3 inline-block text-sm text-base-content/60"
          >
            {m.day_other()} · {m.photo_count({ count: data.otherCount })}
          </Link>
        )}
      </section>

      {/* Sets: the photo is the card */}
      <section className="mt-14">
        <SectionTitle body={m.home_sets_body()}>
          {m.section_sets()}
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.sets.map(set => (
            <Link
              key={set.key}
              to="/photos"
              search={{ set: set.key }}
              className="group relative block overflow-hidden rounded-box"
            >
              <PhotoThumb
                photo={set.photo}
                alt=""
                className="aspect-[4/3] transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pt-10 pb-3 text-white">
                <span className="block font-semibold">{setName(set.key)}</span>
                <span className="block text-xs text-white/75">
                  {m.photo_count({ count: set.count })} ·{' '}
                  {setDescription(set.key)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Credits */}
      <section className="mt-14">
        <SectionTitle body={m.home_credits_body()}>
          {m.section_photographers()}
        </SectionTitle>
        <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {data.photographers.map(p => (
            <li key={p.id}>
              <Link
                to="/photos"
                search={{ by: p.id }}
                className="flex items-baseline justify-between gap-3 border-b border-base-300 py-3 hover:text-primary"
              >
                <span className="truncate font-medium">{p.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-base-content/55">
                  {m.photo_count({ count: p.count })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const DayCard = ({
  summary,
  locale,
}: {
  summary: DaySummary
  locale: string
}) => {
  const max = Math.max(...summary.hours.map(h => h.count))
  const first = summary.hours[0]!.hour
  const last = summary.hours.at(-1)!.hour

  return (
    <div className="rounded-box border border-base-300 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Link
          to="/photos"
          search={{ day: summary.day }}
          className="font-semibold hover:text-primary"
        >
          {formatDay(summary.day, locale, 'long')}
        </Link>
        <span className="text-sm text-base-content/55">
          {m.photo_count({ count: summary.count })}
        </span>
      </div>
      <div className="mt-4 flex h-24 items-end gap-0.5">
        {summary.hours.map(({ hour, count }) => {
          const label = `${formatHourRange(hour)} · ${m.photo_count({ count })}`
          const style = { height: `${Math.max(4, (count / max) * 100)}%` }
          return count ? (
            <Link
              key={hour}
              to="/photos"
              search={{ day: summary.day, hour }}
              title={label}
              aria-label={label}
              style={style}
              className="flex-1 rounded-t-sm bg-primary/55 transition-colors hover:bg-primary"
            />
          ) : (
            <span
              key={hour}
              style={style}
              className="flex-1 rounded-t-sm bg-base-300"
              aria-hidden
            />
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-base-content/50">
        <span>{first}:00</span>
        <span>{last + 1}:00</span>
      </div>
    </div>
  )
}
