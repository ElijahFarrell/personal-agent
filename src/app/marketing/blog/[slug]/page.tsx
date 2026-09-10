import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  articleSchema,
  breadcrumbSchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { marketingMetadata } from '@/lib/marketing/seo'
import { BLOG_POSTS, getPost } from '../posts'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  return marketingMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${slug}`,
  })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <article className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
      <StructuredData
        data={[
          articleSchema({
            title: post.title,
            description: post.description,
            path: `/blog/${slug}`,
            datePublished: post.date,
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: `/blog/${slug}` },
          ]),
        ]}
      />
      <Button variant="ghost" size="sm" className="mb-8 gap-2" asChild>
        <Link href="/blog">
          <ArrowLeft className="h-4 w-4" />
          Blog
        </Link>
      </Button>
      <header>
        <p className="text-xs text-muted-foreground">
          {post.date} · {post.author}
        </p>
        <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
      </header>
      <div className="mt-10 space-y-6">
        {post.blocks.map((block, i) => {
          if (block.type === 'h2') {
            return (
              <h2
                key={i}
                className="font-display pt-4 text-2xl text-foreground"
              >
                {block.text}
              </h2>
            )
          }
          if (block.type === 'ul') {
            return (
              <ul
                key={i}
                className="list-disc space-y-2 pl-5 text-muted-foreground"
              >
                {block.items.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            )
          }
          return (
            <p key={i} className="leading-relaxed text-muted-foreground">
              {block.text}
            </p>
          )
        })}
      </div>
      <p className="mt-12 text-sm">
        <Link href="/audit" className="font-semibold text-brand-600 hover:text-brand-700">
          Start the free diagnostic →
        </Link>
      </p>
    </article>
  )
}
