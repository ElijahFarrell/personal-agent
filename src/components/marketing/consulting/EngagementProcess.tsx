import { engagementSteps } from '@/lib/marketing/consulting-copy'

export function EngagementProcess() {
  const { heading, subheading, steps } = engagementSteps

  return (
    <section
      id="how-it-works-heading"
      className="marketing-section relative px-4 py-20 sm:px-6 sm:py-32"
      aria-labelledby="engagement-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <h2
            id="engagement-heading"
            className="font-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl"
          >
            {heading}
          </h2>
          <p className="mt-3 text-muted-foreground">{subheading}</p>
        </div>
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.step}
              className="marketing-card rounded-xl p-6 sm:p-8"
            >
              <p className="font-mono text-sm tabular-nums text-brand-500">
                {step.step}
              </p>
              <h3 className="font-display mt-3 text-xl text-foreground">
                {step.title}
              </h3>
              <p className="font-mono-accent mt-1 text-brand-600">
                {step.duration}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
