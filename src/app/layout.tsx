import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI OS',
  description: 'Personal AI Operating System',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="font-sans text-gray-100 antialiased">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
