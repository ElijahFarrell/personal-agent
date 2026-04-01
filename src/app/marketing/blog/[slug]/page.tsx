import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMarketingSiteUrl } from '@/lib/marketing/site'
import { BLOG_POSTS, getPost } from '../posts'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${getMarketingSiteUrl()}/blog/${slug}`,
      type: 'article',
      publishedTime: post.date,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const paragraphs = post.content.trim().split(/\n\n+/).filter(Boolean)

  return (
    <article className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
      <Button variant="ghost" size="sm" className="mb-8 gap-2" asChild>
        <Link href="/blog">
          <ArrowLeft className="h-4 w-4" />
          Blog
        </Link>
      </Button>
      <header>
        <p className="text-xs text-muted-foreground">{post.date}</p>
        <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-white md:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
      </header>
      <div className="mt-10 space-y-6">
        {paragraphs.map((block, i) => (
          <p key={i} className="leading-relaxed text-muted-foreground">
            {block}
          </p>
        ))}
      </div>
    </article>
  )
}
