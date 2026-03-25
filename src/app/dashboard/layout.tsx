import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { OnboardUser } from '@/components/OnboardUser'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '220px' } as React.CSSProperties}
    >
      <div className="flex h-screen w-full">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:text-white"
        >
          Skip to main content
        </a>

        <AppSidebar />

        <SidebarInset>
          <main id="main-content" className="flex flex-1 flex-col overflow-hidden">
            <OnboardUser />
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
