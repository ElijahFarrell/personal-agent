import type { Metadata } from 'next'
import { CTASection } from '@/components/marketing/CTASection'
import {
  organizationSchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { founderAbout } from '@/lib/marketing/copy'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Meet Elijah, founder of Shiloh AI — former Microsoft SDE, Fortune 10 engineer, 10+ production AI projects across real estate, healthcare, nonprofits, and more.',
  openGraph: {
    title: 'About · Shiloh AI',
    url: `${getMarketingSiteUrl()}/about`,
  },
}

export default function AboutPage() {
  return (
    <>
      <StructuredData data={organizationSchema()} />
      <article className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <header>
          <p className="text-sm font-medium text-brand-300">
            Production AI systems — not a no-code wrapper shop, not a generic
            marketing agency.
          </p>
          <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
            About Shiloh AI
          </h1>
        </header>
        <div className="mt-10 space-y-8 text-muted-foreground">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white">
              {founderAbout.title}
            </h2>
            <p className="mt-4 leading-relaxed">{founderAbout.lead}</p>
            <p className="mt-4 leading-relaxed">{founderAbout.microsoft}</p>
            <p className="mt-4 leading-relaxed">{founderAbout.fortune10}</p>
          </div>

          <div>
            <p className="leading-relaxed">{founderAbout.sideProjectsIntro}</p>
            <ul className="mt-4 list-inside list-disc space-y-2 pl-1">
              {founderAbout.bullets.map((b) => (
                <li key={b} className="leading-relaxed">
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <p className="leading-relaxed">{founderAbout.closing}</p>

          <h2 className="font-display pt-4 text-2xl font-semibold text-white">
            What we believe
          </h2>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>
              AI in production needs approvals, audit trails, and clear
              ownership — not one-off prompts.
            </li>
            <li>
              Vertical focus beats generic chatbots for compliance and
              integrations.
            </li>
            <li>
              Clear entity copy and structured data help buyers find you in the
              age of LLM answers — we structure pages accordingly.
            </li>
          </ul>
        </div>
        <CTASection />
      </article>
    </>
  )
}
