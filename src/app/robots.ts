import type { MetadataRoute } from 'next'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${getMarketingSiteUrl()}/sitemap.xml`,
  }
}
