import { Outlet, createFileRoute } from '@tanstack/react-router'
import { DefaultLayout } from '@/layout/DefaultLayout'

// Pathless layout: header + footer for every page except the full-screen
// photo viewer
export const Route = createFileRoute('/_site')({
  component: () => (
    <DefaultLayout>
      <Outlet />
    </DefaultLayout>
  ),
})
