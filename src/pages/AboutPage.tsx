import { Link } from '@tanstack/react-router'
import { GitHubIcon } from '@/components/ui/button'
import {
  DERIVATIVE_BYTES,
  objectCount,
  PRICES_CHECKED,
  R2,
  WORKERS,
} from '@/config/hosting'
import { REPO_URL } from '@/config/site'
import type { Photographer, SetKey } from '@/lib/album/types'
import { formatNumber, setDescription, setName } from '@/lib/i18n'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime.js'

export type AboutData = {
  total: number
  /** Photos whose time may be an export time */
  edited: number
  /** Photos with no shoot time (upload time shown) */
  upload: number
  /** Total size of the original files */
  originalBytes: number
  sets: { key: SetKey; count: number }[]
  photographers: Photographer[]
}

const Section = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <section className="border-t border-base-300 pt-8">
    <h2 className="text-xl font-bold">{title}</h2>
    <div className="mt-3 flex flex-col gap-4 leading-relaxed text-base-content/80">
      {children}
    </div>
  </section>
)

const ExternalLink = ({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="link font-medium text-primary"
  >
    {children}
  </a>
)

/** Cloudflare's prices next to what this site uses (the $5 plan left out) */
const CostTable = ({ data }: { data: AboutData }) => {
  const locale = getLocale()
  // Prices go down to $0.015; amounts are whole cents, and nothing is $0
  const usd = (value: number, maximumFractionDigits = 3) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value === 0 ? 0 : 2,
      maximumFractionDigits,
    }).format(value)
  const cost = (value: number) => usd(value, 2)
  const gb = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'gigabyte',
      maximumFractionDigits: 1,
    }).format(value)
  const millions = (value: number) =>
    new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'long',
    }).format(value)
  const month = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(PRICES_CHECKED))

  const storedGb = (data.originalBytes + DERIVATIVE_BYTES) / 1e9
  const storageCost = Math.max(0, storedGb - R2.freeGb) * R2.perGbMonth
  const zero = cost(0)
  const free = m.about_cost_within_free({ zero })

  const rows = [
    [
      m.about_cost_storage(),
      gb(R2.freeGb),
      m.about_cost_per_gb_month({ price: usd(R2.perGbMonth) }),
      m.about_cost_stored({ size: gb(storedGb), cost: cost(storageCost) }),
    ],
    [
      m.about_cost_reads(),
      millions(R2.freeReads),
      m.about_cost_per_million({ price: usd(R2.perMillionReads) }),
      free,
    ],
    [
      m.about_cost_writes(),
      millions(R2.freeWrites),
      m.about_cost_per_million({ price: usd(R2.perMillionWrites) }),
      m.about_cost_uploaded({
        count: formatNumber(objectCount(data.total), locale),
        zero,
      }),
    ],
    [m.about_cost_egress(), m.about_cost_unlimited(), '—', zero],
    [
      m.about_cost_requests(),
      millions(WORKERS.freeRequests),
      m.about_cost_per_million({ price: usd(WORKERS.perMillionRequests) }),
      free,
    ],
    [
      m.about_cost_cpu(),
      m.about_cost_ms({ amount: millions(WORKERS.freeCpuMs) }),
      m.about_cost_per_million_ms({ price: usd(WORKERS.perMillionCpuMs) }),
      free,
    ],
    [m.about_cost_assets(), m.about_cost_unlimited(), '—', zero],
  ]

  return (
    <>
      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>{m.about_cost_col_item()}</th>
              <th>{m.about_cost_col_free()}</th>
              <th>{m.about_cost_col_beyond()}</th>
              <th>{m.about_cost_col_now()}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([item, ...cells]) => (
              <tr key={item}>
                <th className="font-medium text-base-content">{item}</th>
                {cells.map((cell, i) => (
                  <td key={i} className="tabular-nums">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={3} className="text-base-content">
                {m.about_cost_total()}
              </th>
              <td className="font-bold tabular-nums text-base-content">
                {m.about_cost_month({ cost: cost(storageCost) })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-sm text-base-content/60">
        {m.about_cost_note({ date: month })}
      </p>
    </>
  )
}

export const AboutPage = ({ data }: { data: AboutData }) => {
  const locale = getLocale()
  const n = (value: number) => formatNumber(value, locale)
  const gigabytes = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'gigabyte',
    maximumFractionDigits: 0,
  }).format(data.originalBytes / 1e9)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
      <h1 className="text-4xl font-bold tracking-tight">{m.about_title()}</h1>
      <p className="mt-4 text-lg leading-relaxed text-base-content/75">
        {m.about_lead()}
      </p>

      <div className="mt-10 flex flex-col gap-10">
        <Section title={m.about_event_title()}>
          <p>{m.about_event_body({ dates: m.event_dates() })}</p>
          <p>
            <ExternalLink href="https://dollweekend.cn/">
              {m.footer_official_site()} ↗
            </ExternalLink>
          </p>
        </Section>

        <Section title={m.about_source_title()}>
          <p>{m.about_source_body({ count: n(data.total) })}</p>
        </Section>

        <Section title={m.about_sets_title()}>
          <p>{m.about_sets_body()}</p>
          <ul className="divide-y divide-base-300 rounded-box border border-base-300">
            {data.sets.map(set => (
              <li key={set.key}>
                <Link
                  to="/photos"
                  search={{ set: set.key }}
                  className="flex items-baseline gap-4 px-4 py-3 hover:bg-base-200"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-base-content">
                      {setName(set.key)}
                    </span>
                    <span className="block text-sm text-base-content/60">
                      {setDescription(set.key)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-base-content/55">
                    {m.photo_count({ count: set.count })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={m.about_times_title()}>
          <p>
            {m.about_times_body({
              edited: n(data.edited),
              upload: n(data.upload),
            })}
          </p>
        </Section>

        <Section title={m.about_downloads_title()}>
          <p>{m.about_downloads_body()}</p>
          <p>{m.about_files_body()}</p>
          <p>
            {/* Static asset (scripts/gen-files.ts), not a route */}
            <a href="/files.json" className="link font-medium text-primary">
              files.json
            </a>
          </p>
        </Section>

        <Section title={m.about_usage_title()}>
          <p>{m.about_usage_body()}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {data.photographers.map(p => (
              <li key={p.id}>
                <Link
                  to="/photos"
                  search={{ by: p.id }}
                  className="font-medium text-base-content hover:text-primary"
                >
                  {p.name}
                </Link>{' '}
                <span className="tabular-nums text-base-content/55">
                  {n(p.count)}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={m.about_hosting_title()}>
          <p>{m.about_hosting_body({ size: gigabytes })}</p>
          <p>{m.about_billing_body()}</p>
          <CostTable data={data} />
          <p>{m.about_self_host_body()}</p>
        </Section>

        <Section title={m.about_code_title()}>
          <p>{m.about_code_body()}</p>
          <p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-base-300 px-4 py-2 font-medium text-base-content transition-colors hover:border-primary hover:text-primary"
            >
              <GitHubIcon className="size-5" />
              {REPO_URL.replace(/^https:\/\//, '')}
            </a>
          </p>
        </Section>
      </div>
    </div>
  )
}
