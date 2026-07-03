import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CaseStudyDetail } from '@/components/marketing/consulting/CaseStudyDetail'
import {
  ascHealthcareServiceSchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { getAllCaseStudySlugs, getCaseStudy } from '@/lib/marketing/case-studies'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

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

  return {
    title: study.headline,
    description: study.summary,
    openGraph: {
      title: `${study.headline} · Shiloh AI`,
      description: study.summary,
      url: `${getMarketingSiteUrl()}/work/${slug}`,
    },
  }
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params
  const study = getCaseStudy(slug)
  if (!study) notFound()

  const isHealthcare = slug === 'surgery-center-voice-agent'

  return (
    <>
      {isHealthcare ? (
        <StructuredData data={ascHealthcareServiceSchema()} />
      ) : null}
      <CaseStudyDetail study={study} />
    </>
  )
}
