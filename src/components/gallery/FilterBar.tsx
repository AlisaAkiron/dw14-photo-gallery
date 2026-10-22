import { Link, useNavigate } from '@tanstack/react-router'
import type { Facets, GallerySearch } from '@/lib/album/filters'
import { hasFilters } from '@/lib/album/filters'
import { EVENT_DAYS, formatDay, formatHourRange } from '@/lib/album/time'
import type { Photographer } from '@/lib/album/types'
import { SET_KEYS } from '@/lib/album/types'
import { formatNumber, setName } from '@/lib/i18n'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime.js'
import { cn } from '@/utils/cn'

type FilterBarProps = {
  search: GallerySearch
  facets: Facets
  photographers: Photographer[]
}

const sum = (counts: Record<PropertyKey, number | undefined>) =>
  Object.values(counts).reduce<number>((n, c) => n + (c ?? 0), 0)

/** One option of a chip row: a search update, or nothing if it'd be empty */
const Chip = ({
  label,
  count,
  active,
  search,
}: {
  label: string
  count: number
  active: boolean
  search: (prev: GallerySearch) => GallerySearch
}) => {
  const locale = getLocale()
  const content = (
    <>
      {label}
      <span
        className={cn('tabular-nums', active ? 'opacity-80' : 'opacity-50')}
      >
        {formatNumber(count, locale)}
      </span>
    </>
  )
  const className = cn(
    'btn btn-sm shrink-0 gap-1.5 rounded-full font-normal',
    active ? 'btn-primary' : 'btn-ghost border-base-300',
  )
  if (!count && !active) {
    return (
      <span className={cn(className, 'btn-disabled')} aria-disabled>
        {content}
      </span>
    )
  }
  return (
    <Link
      to="/photos"
      search={search}
      aria-current={active ? 'true' : undefined}
      className={className}
    >
      {content}
    </Link>
  )
}

const ChipRow = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="flex items-center gap-3">
    <span className="hidden w-24 shrink-0 text-sm text-base-content/60 sm:block">
      {label}
    </span>
    <div
      role="group"
      aria-label={label}
      className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {children}
    </div>
  </div>
)

export const FilterBar = ({
  search,
  facets,
  photographers,
}: FilterBarProps) => {
  const navigate = useNavigate({ from: '/photos/' })
  const locale = getLocale()
  const showHours = search.day && search.day !== 'other'
  const hours = Object.keys(facets.hour)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="flex flex-col gap-3">
      <ChipRow label={m.filter_set()}>
        <Chip
          label={m.filter_all()}
          count={sum(facets.set)}
          active={!search.set}
          search={prev => ({ ...prev, set: undefined })}
        />
        {SET_KEYS.map(key => (
          <Chip
            key={key}
            label={setName(key)}
            count={facets.set[key] ?? 0}
            active={search.set === key}
            search={prev => ({ ...prev, set: key })}
          />
        ))}
      </ChipRow>

      <ChipRow label={m.filter_day()}>
        <Chip
          label={m.filter_all()}
          count={sum(facets.day)}
          active={!search.day}
          search={prev => ({ ...prev, day: undefined, hour: undefined })}
        />
        {EVENT_DAYS.map(day => (
          <Chip
            key={day}
            label={formatDay(day, locale)}
            count={facets.day[day] ?? 0}
            active={search.day === day}
            search={prev => ({ ...prev, day, hour: undefined })}
          />
        ))}
        {(facets.day.other || search.day === 'other') && (
          <Chip
            label={m.day_other()}
            count={facets.day.other ?? 0}
            active={search.day === 'other'}
            search={prev => ({ ...prev, day: 'other', hour: undefined })}
          />
        )}
      </ChipRow>

      {showHours && (
        <ChipRow label={m.filter_time()}>
          <Chip
            label={m.filter_any_time()}
            count={sum(facets.hour)}
            active={search.hour === undefined}
            search={prev => ({ ...prev, hour: undefined })}
          />
          {hours.map(hour => (
            <Chip
              key={hour}
              label={formatHourRange(hour)}
              count={facets.hour[hour] ?? 0}
              active={search.hour === hour}
              search={prev => ({ ...prev, hour })}
            />
          ))}
        </ChipRow>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm text-base-content/60 max-sm:w-auto">
            {m.filter_photographer()}
          </span>
          <select
            className="select select-sm w-56 rounded-full"
            value={search.by ?? ''}
            onChange={e => {
              const by = e.target.value ? Number(e.target.value) : undefined
              void navigate({ search: prev => ({ ...prev, by }) })
            }}
          >
            <option value="">
              {m.filter_all()} ({formatNumber(sum(facets.by), locale)})
            </option>
            {photographers.map(p => (
              <option
                key={p.id}
                value={p.id}
                disabled={!facets.by[p.id] && search.by !== p.id}
              >
                {p.name} ({formatNumber(facets.by[p.id] ?? 0, locale)})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3">
          <span className="text-sm text-base-content/60">{m.sort_label()}</span>
          <select
            className="select select-sm w-40 rounded-full"
            value={search.sort ?? 'oldest'}
            onChange={e => {
              const sort = e.target.value === 'newest' ? 'newest' : undefined
              void navigate({ search: prev => ({ ...prev, sort }) })
            }}
          >
            <option value="oldest">{m.sort_oldest()}</option>
            <option value="newest">{m.sort_newest()}</option>
          </select>
        </label>
        {hasFilters(search) && (
          <Link
            to="/photos"
            search={prev => ({ sort: prev.sort })}
            className="btn btn-ghost btn-sm rounded-full font-normal text-primary"
          >
            {m.filter_clear()}
          </Link>
        )}
      </div>
    </div>
  )
}
