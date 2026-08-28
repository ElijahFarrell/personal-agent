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
        <div className="mb-4 max-w-2xl">
          <p className="font-mono-accent text-muted-foreground">How it works</p>
          <h2
            id="engagement-heading"
            className="font-display mt-3 text-3xl tracking-tight text-foreground sm:text-4xl"
          >
            {heading}
          </h2>
          <p className="mt-3 text-muted-foreground">{subheading}</p>
        </div>
        <ol className="mt-12 divide-y divide-border border-y border-border">
          {steps.map((step) => (
            <li
              key={step.step}
              className="grid gap-4 py-10 sm:grid-cols-[6.5rem_1fr] sm:gap-10 sm:py-14"
            >
              <p className="font-display text-4xl tabular-nums text-brand-600 sm:text-5xl">
                {step.step}
              </p>
              <div>
                <h3 className="font-display text-2xl text-foreground sm:text-3xl">
                  {step.title}
                </h3>
                <p className="font-mono-accent mt-2 text-brand-600">
                  {step.duration}
                </p>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
