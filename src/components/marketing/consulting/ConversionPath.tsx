import { conversionPath } from '@/lib/marketing/consulting-copy'

export function ConversionPath({
  compact = false,
}: {
  compact?: boolean
}) {
  const { eyebrow, heading, subheading, steps } = conversionPath

  return (
    <section
      className={
        compact
          ? 'relative px-4 py-12 sm:px-6'
          : 'relative border-y border-border px-4 py-16 sm:px-6 sm:py-20'
      }
      aria-labelledby="conversion-path-heading"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono-accent text-muted-foreground">{eyebrow}</p>
        <h2
          id="conversion-path-heading"
          className="font-display mt-3 max-w-2xl text-2xl tracking-tight text-foreground sm:text-3xl"
        >
          {heading}
        </h2>
        {compact ? null : (
          <p className="mt-3 max-w-2xl text-muted-foreground">{subheading}</p>
        )}
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {steps.map((step) => (
            <li key={step.step}>
              <p className="font-display text-2xl tabular-nums text-brand-600">
                {step.step}
              </p>
              <h3 className="mt-2 text-base font-medium text-foreground">
                {step.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
