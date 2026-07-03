import type { MetadataRoute } from 'next'
import { BLOG_POSTS } from '@/app/marketing/blog/posts'
import { getAllCaseStudySlugs } from '@/lib/marketing/case-studies'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getMarketingSiteUrl()
  const staticPaths = [
    '',
    '/audit',
    '/services',
    '/work',
    '/pricing',
    '/about',
    '/blog',
  ]
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path || '/'}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  for (const slug of getAllCaseStudySlugs()) {
    entries.push({
      url: `${base}/work/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

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
