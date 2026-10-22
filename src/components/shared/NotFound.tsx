import { Link } from '@tanstack/react-router'
import { DefaultLayout } from '@/layout/DefaultLayout'
import { m } from '@/paraglide/messages.js'

export const NotFound = ({ message }: { message?: string }) => {
  return (
    <DefaultLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-lg font-semibold">{m.not_found_title()}</p>
        <p className="text-base-content/65">{message ?? m.not_found_body()}</p>
        <Link to="/" className="btn btn-primary mt-2 rounded-full px-6">
          {m.back_home()}
        </Link>
      </div>
    </DefaultLayout>
  )
}
