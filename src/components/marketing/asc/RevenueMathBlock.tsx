import { revenueMath } from '@/lib/marketing/asc-copy'
import { SectionHeader } from './SectionHeader'

export function RevenueMathBlock() {
  const { scenario, highlight } = revenueMath
  const weeklyLoss =
    scenario.casesPerWeek *
    scenario.avgCaseValue *
    scenario.cancellationRate

  return (
    <section
      className="marketing-section relative px-4 py-16 sm:px-6 sm:py-24"
      aria-labelledby="revenue-math-heading"
    >
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          id="revenue-math-heading"
          title={revenueMath.heading}
          subtitle={revenueMath.intro}
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass rounded-2xl p-6 sm:p-8">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Your baseline (illustrative)
            </p>
            <dl className="mt-6 space-y-5">
              <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
                <dt className="text-muted-foreground">Cases per week</dt>
                <dd className="font-display text-2xl font-semibold tabular-nums text-foreground">
                  {scenario.casesPerWeek}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
                <dt className="text-muted-foreground">Average case value</dt>
                <dd className="font-display text-2xl font-semibold tabular-nums text-foreground">
                  ${scenario.avgCaseValue.toLocaleString('en-US')}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
                <dt className="text-muted-foreground">Cancellation rate</dt>
                <dd className="font-display text-2xl font-semibold tabular-nums text-foreground">
                  {scenario.cancellationRate * 100}%
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="font-medium text-foreground">
                  Lost revenue per week
                </dt>
                <dd className="font-display text-3xl font-semibold tabular-nums text-destructive">
                  ${weeklyLoss.toLocaleString('en-US')}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border-2 border-brand-500/30 bg-gradient-to-br from-brand-50 to-card p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
              {highlight.label}
            </p>
            <p className="mt-4 font-display text-5xl font-semibold tabular-nums tracking-tight text-brand-700 sm:text-6xl">
              {highlight.value}
            </p>
            <p className="mt-2 text-lg font-medium text-foreground">
              {highlight.period}
            </p>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              {revenueMath.footnote}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
