import Link from 'next/link'
import { WorkflowDiagram } from '@/components/marketing/consulting/WorkflowDiagram'
import { featuredCaseStudy } from '@/lib/marketing/consulting-copy'

const beforeSteps = [
  'Read 50+ page grant document manually',
  'Research requirements across sources',
  'Draft narrative from scratch',
  'Review and revise over multiple sessions',
] as const

const afterSteps = [
  'Upload docs — auto-ingested into knowledge base',
  'Ask direct questions to long documents',
  'Generate first-draft narrative from org data',
  'Writer reviews and submits faster',
] as const

export function FeaturedCaseStudy() {
  const { clientType, headline, problem, solution, metrics, testimonial, slug } =
    featuredCaseStudy

  return (
    <section
      className="relative px-4 py-20 sm:px-6 sm:py-32"
      aria-labelledby="featured-case-heading"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono-accent text-brand-600">{clientType}</p>
        <h2
          id="featured-case-heading"
          className="font-display mt-3 max-w-3xl text-3xl font-normal tracking-tight text-foreground sm:text-4xl"
        >
          {headline}
        </h2>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">The problem</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {problem}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">What we built</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {solution}
              </p>
            </div>
            <WorkflowDiagram before={beforeSteps} after={afterSteps} />
          </div>

          <div className="marketing-card flex flex-col rounded-xl p-6 sm:p-8">
            <p className="font-mono-accent text-muted-foreground">Results</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
              {metrics.map((m) => (
                <div key={m.label}>
                  <p className="font-display text-3xl tabular-nums text-foreground">
                    {m.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
            <blockquote className="mt-8 flex-1 border-t border-border pt-8">
              <p className="font-display text-lg leading-relaxed text-foreground sm:text-xl">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <footer className="mt-4 text-sm text-muted-foreground">
                — {testimonial.attribution}
              </footer>
            </blockquote>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-6">
          <Link
            href={`/work/${slug}`}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Read the full case study →
          </Link>
          <Link
            href="/work"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            See all work →
          </Link>
        </div>
      </div>
    </section>
  )
}
