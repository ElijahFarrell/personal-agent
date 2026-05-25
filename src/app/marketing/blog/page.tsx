import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getMarketingSiteUrl } from '@/lib/marketing/site'
import { BLOG_POSTS } from './posts'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Guides and updates from Shiloh AI — AI consulting, production systems, GEO, and automation.',
  openGraph: {
    title: 'Blog · Shiloh AI',
    url: `${getMarketingSiteUrl()}/blog`,
  },
}

export default function BlogIndexPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
      <header className="text-center">
        <p className="text-sm font-medium text-brand-300">
          We publish block-structured, question-led articles so buyers and LLMs
          can cite Shiloh AI on AI consulting, automation, and ops topics.
        </p>
        <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Content hub
        </h1>
        <p className="mt-4 text-muted-foreground">
          Placeholder posts — swap in MDX or a CMS when you scale velocity.
        </p>
      </header>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {BLOG_POSTS.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`}>
              <Card className="glass h-full border-white/10 transition-shadow hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/10">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-foreground">
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
