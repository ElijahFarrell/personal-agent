import { ClerkProvider } from '@clerk/nextjs'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'
import { Toaster } from 'sonner'

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <ConvexClientProvider>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </ConvexClientProvider>
    </ClerkProvider>
  )
}
