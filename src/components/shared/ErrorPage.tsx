import { useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { DefaultLayout } from '@/layout/DefaultLayout'
import { m } from '@/paraglide/messages.js'

export const ErrorPage = ({ error, reset }: ErrorComponentProps) => {
  const router = useRouter()
  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6 justify-center items-center min-h-[60vh] px-4 text-center">
        <h1 className="text-3xl font-semibold">{m.error_title()}</h1>
        <p className="max-w-lg break-words font-mono text-sm text-base-content/60">
          {error instanceof Error ? error.message : String(error)}
        </p>
        <button
          type="button"
          className="btn btn-primary rounded-full px-6"
          onClick={() => {
            reset()
            void router.invalidate()
          }}
        >
          {m.error_retry()}
        </button>
      </div>
    </DefaultLayout>
  )
}
