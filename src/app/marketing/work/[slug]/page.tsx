import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CaseStudyDetail } from '@/components/marketing/consulting/CaseStudyDetail'
import {
  ascHealthcareServiceSchema,
  breadcrumbSchema,
  caseStudySchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { getAllCaseStudySlugs, getCaseStudy } from '@/lib/marketing/case-studies'
import { marketingMetadata } from '@/lib/marketing/seo'

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllCaseStudySlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const study = getCaseStudy(slug)
  if (!study) return { title: 'Case study not found' }

  return marketingMetadata({
    title: study.headline,
    description: study.summary,
    path: `/work/${slug}`,
    ogTitle: `${study.headline} · Shiloh`,
  })
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params
  const study = getCaseStudy(slug)
  if (!study) notFound()

  const isHealthcare = slug === 'surgery-center-voice-agent'
  const schemas = [
    caseStudySchema({
      headline: study.headline,
      summary: study.summary,
      slug,
    }),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Work', path: '/work' },
      { name: study.headline, path: `/work/${slug}` },
    ]),
    ...(isHealthcare ? [ascHealthcareServiceSchema()] : []),
  ]

  return (
    <>
      <StructuredData data={schemas} />
      <CaseStudyDetail study={study} />
    </>
  )
}
