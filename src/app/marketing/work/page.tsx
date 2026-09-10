import type { Metadata } from 'next'
import { CaseStudyCard } from '@/components/marketing/consulting/CaseStudyCard'
import { CTASection } from '@/components/marketing/CTASection'
import { CASE_STUDIES } from '@/lib/marketing/case-studies'
import {
  breadcrumbSchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { workPage } from '@/lib/marketing/consulting-copy'
import { marketingMetadata } from '@/lib/marketing/seo'

export const metadata: Metadata = marketingMetadata({
  title: workPage.title,
  description: workPage.subheading,
  path: '/work',
  ogTitle: `${workPage.title} · Shiloh`,
})

export default function WorkPage() {
  return (
    <article className="px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Work', path: '/work' },
        ])}
      />
      <header className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl font-normal tracking-tight text-foreground md:text-5xl">
          {workPage.heading}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{workPage.subheading}</p>
      </header>
      <div className="mx-auto mt-16 max-w-6xl">
        {CASE_STUDIES.map((study, index) => (
          <CaseStudyCard key={study.slug} study={study} index={index} />
        ))}
      </div>
      <CTASection />
    </article>
  )
}
