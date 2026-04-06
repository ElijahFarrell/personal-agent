import { MarketingBackground } from '@/components/marketing/MarketingBackground'
import { ChatWidget } from '@/components/marketing/ChatWidget'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <MarketingBackground />
      <MarketingNavbar />
      <div className="relative z-10">{children}</div>
      <MarketingFooter />
      <ChatWidget />
    </>
  )
}
