import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  breadcrumbSchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { marketingMetadata } from '@/lib/marketing/seo'
import { BLOG_POSTS } from './posts'

export const metadata: Metadata = marketingMetadata({
  title: 'Blog',
  description:
    'Decision-grade notes on AI audits, production workflows, and how Shiloh scopes fixed-fee work.',
  path: '/blog',
  ogTitle: 'Blog · Shiloh',
})

export default function BlogIndexPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ])}
      />
      <header className="text-center">
        <p className="font-mono-accent text-brand-600">
          Insights on AI consulting and production systems
        </p>
        <h1 className="font-display mt-4 text-4xl font-normal tracking-tight text-foreground md:text-5xl">
          Blog
        </h1>
        <p className="mt-4 text-muted-foreground">
          Decision-grade answers on the audit, cost, and workflows we have actually shipped.
        </p>
      </header>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {BLOG_POSTS.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`}>
              <Card className="marketing-card h-full transition-colors hover:border-brand-300">
                <CardHeader>
                  <CardTitle className="font-display text-lg font-normal text-foreground">
                    {post.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{post.date}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {post.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  )
}
