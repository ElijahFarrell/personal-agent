import { proofSection } from '@/lib/marketing/asc-copy'
import { SectionHeader } from './SectionHeader'

export function ProofSection() {
  return (
    <section
      className="marketing-section relative px-4 py-16 sm:px-6 sm:py-24"
      aria-labelledby="proof-heading"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          id="proof-heading"
          title={proofSection.heading}
          subtitle={proofSection.subheading}
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {proofSection.testimonials.map((t) => (
            <blockquote
              key={t.id}
              className="glass rounded-2xl p-8 lg:col-span-1"
            >
              <p className="font-display text-xl leading-relaxed text-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-6 flex flex-wrap items-center gap-3">
                <cite className="not-italic font-semibold text-foreground">
                  {t.attribution}
                </cite>
                {t.isParaphrase ? (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    Representative outcome
                  </span>
                ) : null}
              </footer>
              {t.context ? (
                <p className="mt-2 text-sm text-muted-foreground">{t.context}</p>
              ) : null}
              {t.results ? (
                <ul className="mt-6 space-y-2 border-t border-border pt-6">
                  {t.results.map((r) => (
                    <li
                      key={r}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                        aria-hidden
                      />
                      {r}
                    </li>
                  ))}
                </ul>
              ) : null}
            </blockquote>
          ))}

          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Broader track record
            </p>
            {proofSection.trackRecord.map((item) => (
              <div
                key={item.label}
                className="glass rounded-xl px-5 py-4"
              >
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
