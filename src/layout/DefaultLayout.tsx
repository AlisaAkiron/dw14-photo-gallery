import { Footer, Header } from '@/components/shared/layout'
import { BackToTop } from '@/components/ui/button'
import { cn } from '@/utils/cn'

export const DefaultLayout = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className={cn('relative z-1 flex-1', className)}>{children}</main>
      <Footer />
      <BackToTop />
    </div>
  )
}
