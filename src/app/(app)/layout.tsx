import { ClerkProvider } from '@clerk/nextjs'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ClerkProvider>
  )
}
