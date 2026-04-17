import { processStepsSection } from '@/lib/marketing/copy'

export function ProcessSteps() {
  const { heading, subheading, steps } = processStepsSection
  return (
    <section
      className="relative px-4 py-16 sm:px-6"
      aria-labelledby="process-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2
            id="process-heading"
            className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl"
          >
            {heading}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {subheading}
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li
              key={s.step}
              className="glass relative rounded-2xl border border-white/10 bg-card/40 p-6"
            >
              <span
                className="font-display text-3xl font-bold tabular-nums text-brand-400"
                aria-hidden
              >
                {s.step}
              </span>
              <h3 className="font-display mt-3 text-lg font-semibold text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
