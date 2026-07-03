import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CTASection } from '@/components/marketing/CTASection'
import { founderAbout } from '@/lib/marketing/consulting-copy'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'About',
  description:
    'About Shiloh AI — engineering-led AI consulting from Amazon and Microsoft backgrounds. Audit, build, train, and hand off production systems.',
  openGraph: {
    title: 'About · Shiloh AI',
    url: `${getMarketingSiteUrl()}/about`,
  },
}

export default function AboutPage() {
  const { title, lead, story, philosophy, values } = founderAbout

  return (
    <article className="px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
      <header className="mx-auto max-w-3xl">
        <p className="font-mono-accent text-brand-600">About</p>
        <h1 className="font-display mt-4 text-4xl font-normal tracking-tight text-foreground md:text-5xl">
          {title}
        </h1>
        <p className="mt-6 text-xl leading-relaxed text-muted-foreground">
          {lead}
        </p>
      </header>

      <div className="mx-auto mt-12 max-w-3xl space-y-6">
        {story.map((paragraph) => (
          <p
            key={paragraph.slice(0, 40)}
            className="text-base leading-relaxed text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
      </div>

      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="font-display text-2xl text-foreground">
          How we work
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {philosophy}
        </p>
        <ul className="mt-6 space-y-3">
          {values.map((value) => (
            <li
              key={value}
              className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
            >
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-500"
                aria-hidden
              />
              {value}
            </li>
          ))}
        </ul>
      </section>

      <div className="mx-auto mt-12 max-w-3xl">
        <Button
          className="rounded-full bg-brand-600 font-semibold text-white hover:bg-brand-700"
          asChild
        >
          <Link href="/audit" className="gap-2">
            Start the free AI audit
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <CTASection />
    </article>
  )
}
