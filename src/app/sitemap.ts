import type { MetadataRoute } from 'next'
import { BLOG_POSTS } from '@/app/marketing/blog/posts'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getMarketingSiteUrl()
  const staticPaths = [
    '',
    '/audit',
    '/services',
    '/industries',
    '/pricing',
    '/real-estate',
    '/blog',
  ]
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path || '/'}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.8,
  }))
  for (const post of BLOG_POSTS) {
    entries.push({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }
  return entries
}
