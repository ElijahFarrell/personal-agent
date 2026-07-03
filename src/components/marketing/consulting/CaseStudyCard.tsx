import Link from 'next/link'
import type { CaseStudy } from '@/lib/marketing/case-studies'

export function CaseStudyCard({
  study,
  index,
}: {
  study: CaseStudy
  index: number
}) {
  const reversed = index % 2 === 1

  return (
    <article
      className={`grid gap-8 border-t border-border py-12 first:border-t-0 first:pt-0 lg:grid-cols-2 lg:items-center lg:gap-16 ${
        reversed ? 'lg:[direction:rtl]' : ''
      }`}
    >
      <div className={reversed ? 'lg:[direction:ltr]' : ''}>
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
        <p className="font-mono-accent mt-4 text-brand-600">{study.clientType}</p>
        <h2 className="font-display mt-2 text-2xl text-foreground sm:text-3xl">
          <Link
            href={`/work/${study.slug}`}
            className="hover:text-brand-600"
          >
            {study.headline}
          </Link>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {study.summary}
        </p>
        <Link
          href={`/work/${study.slug}`}
          className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Read case study →
        </Link>
      </div>
      <div
        className={`marketing-card rounded-xl p-6 sm:p-8 ${
          reversed ? 'lg:[direction:ltr]' : ''
        }`}
      >
        <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
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
    </article>
  )
}
