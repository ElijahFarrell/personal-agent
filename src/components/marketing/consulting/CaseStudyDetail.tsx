import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ArchitectureDiagram } from '@/components/marketing/consulting/WorkflowDiagram'
import { WorkflowDiagram } from '@/components/marketing/consulting/WorkflowDiagram'
import type { CaseStudy } from '@/lib/marketing/case-studies'
import { serviceDetails } from '@/lib/marketing/consulting-copy'

type CaseStudyDetailProps = {
  study: CaseStudy
}

function getWorkflowSteps(study: CaseStudy): {
  before: string[]
  after: string[]
} {
  switch (study.slug) {
    case 'grant-writing-automation':
      return {
        before: [
          'Read 50+ page grant document manually',
          'Research requirements across sources',
          'Draft narrative from scratch',
          'Multiple revision cycles',
        ],
        after: [
          'Upload docs — auto-ingested',
          'Query documents directly',
          'Generate first-draft narrative',
          'Writer reviews and submits',
        ],
      }
    case 'real-estate-crm-and-voice':
      return {
        before: [
          'Pay for bloated CRM',
          'Manual data entry',
          'Dormant leads never called',
          'Deals slip through cracks',
        ],
        after: [
          'Custom CRM fits workflow',
          'Automated lead sync',
          'Voice agent reactivates leads',
          'Pipeline stays current',
        ],
      }
    default:
      return {
        before: study.problem.split('. ').slice(0, 3),
        after: study.results.slice(0, 3),
      }
  }
}

export function CaseStudyDetail({ study }: CaseStudyDetailProps) {
  const relatedService = serviceDetails.find(
    (s) => s.id === study.relatedServiceId
  )
  const { before, after } = getWorkflowSteps(study)

  return (
    <article>
      <header className="px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap gap-2">
            {study.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="font-mono-accent mt-6 text-brand-600">{study.clientType}</p>
          <h1 className="font-display mt-3 text-3xl font-normal tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {study.headline}
          </h1>
          <div className="mt-8 flex flex-wrap gap-8">
            {study.metrics.map((m) => (
              <div key={m.label}>
                <p className="font-display text-3xl tabular-nums text-foreground">
                  {m.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="border-t border-border px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-12">
          <div>
            <h2 className="font-display text-2xl text-foreground">The problem</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {study.problem}
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">What we built</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {study.solution}
            </p>
            <ArchitectureDiagram
              steps={study.architecture}
              className="mt-6"
            />
            <WorkflowDiagram
              before={before}
              after={after}
              className="mt-6"
            />
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">The results</h2>
            <ul className="mt-4 space-y-3">
              {study.results.map((result) => (
                <li
                  key={result}
                  className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                >
                  <span
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-500"
                    aria-hidden
                  />
                  {result}
                </li>
              ))}
            </ul>
            {study.testimonial ? (
              <blockquote className="mt-8 border-l-2 border-brand-300 pl-6">
                <p className="font-display text-lg leading-relaxed text-foreground">
                  &ldquo;{study.testimonial.quote}&rdquo;
                </p>
                <footer className="mt-3 text-sm text-muted-foreground">
                  — {study.testimonial.attribution}
                </footer>
              </blockquote>
            ) : null}
          </div>

          {relatedService ? (
            <div className="marketing-card rounded-xl p-6">
              <p className="font-mono-accent text-muted-foreground">Related service</p>
              <h3 className="font-display mt-2 text-xl text-foreground">
                {relatedService.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {relatedService.priceRange} · {relatedService.timeline}
              </p>
              <Link
                href={`/services#${relatedService.id}`}
                className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Learn more →
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-t border-border bg-card/60 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl text-foreground sm:text-3xl">
            Ready to find your highest-ROI opportunity?
          </h2>
          <Button
            size="lg"
            className="mt-6 h-12 rounded-full bg-brand-600 px-8 font-semibold text-background hover:bg-brand-700"
            asChild
          >
            <Link href="/audit" className="gap-2">
              Start the free AI audit
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </article>
  )
}
