import { howItWorks } from '@/lib/marketing/asc-copy'
import { SectionHeader } from './SectionHeader'

export function AscHowItWorks() {
  return (
    <section
      className="marketing-section relative px-4 py-16 sm:px-6 sm:py-24"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          id="how-it-works-heading"
          title={howItWorks.heading}
          subtitle={howItWorks.subheading}
        />

        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {howItWorks.steps.map((step) => (
            <li key={step.step} className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-background">
                {step.step}
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
