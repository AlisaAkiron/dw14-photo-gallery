import { m } from '@/paraglide/messages.js'

export const Footer = () => {
  return (
    <footer className="mt-16 border-t border-base-300 text-sm text-base-content/60">
      <div className="mx-auto flex max-w-[96rem] flex-col gap-4 px-4 py-8 md:flex-row md:justify-between lg:px-8">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-base-content/80">
            {m.site_title()} · {m.event_dates()}
          </p>
          <p>
            {m.footer_photos_credit()} {m.footer_archived()}
          </p>
        </div>
        <div className="flex flex-col gap-1 md:items-end">
          <a
            className="link link-hover"
            href="https://dollweekend.cn/"
            target="_blank"
            rel="noreferrer"
          >
            {m.footer_official_site()} ↗
          </a>
          <p>
            {m.footer_made_by()}
            <a
              className="link link-hover"
              href="https://alisaqaq.moe"
              target="_blank"
              rel="noreferrer"
            >
              Alisa Akiron
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
