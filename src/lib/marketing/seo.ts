import type { Metadata } from 'next'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export function absoluteMarketingUrl(path: string): string {
  const base = getMarketingSiteUrl()
  if (path === '/' || path === '') return `${base}/`
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function marketingMetadata(opts: {
  title: string
  description: string
  path: string
  ogTitle?: string
}): Metadata {
  const url = absoluteMarketingUrl(opts.path)
  const ogTitle = opts.ogTitle ?? opts.title
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description: opts.description,
      url,
      siteName: 'Shiloh',
      locale: 'en_US',
      type: 'website',
    },
  }
}
