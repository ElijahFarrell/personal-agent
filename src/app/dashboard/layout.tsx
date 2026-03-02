import { DashboardNav } from '@/components/DashboardNav'
import { OnboardUser } from '@/components/OnboardUser'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <aside
        className="sticky top-0 h-screen w-[220px] shrink-0 border-r border-gray-800/60 bg-gray-900/40 backdrop-blur-sm"
        aria-label="Sidebar"
      >
        <DashboardNav />
      </aside>

      <main id="main-content" className="flex flex-1 flex-col overflow-hidden">
        <OnboardUser />
        {children}
      </main>
    </div>
  )
}
