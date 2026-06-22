import { audienceSection } from '@/lib/marketing/asc-copy'
import { SectionHeader } from './SectionHeader'

export function AudienceSection() {
  return (
    <section
      className="marketing-section relative border-y border-border/60 bg-card/30 px-4 py-16 sm:px-6 sm:py-24"
      aria-labelledby="audience-heading"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          id="audience-heading"
          title={audienceSection.heading}
          subtitle={audienceSection.subheading}
        />

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {audienceSection.specialties.map((specialty) => (
            <span
              key={specialty}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
            >
              {specialty}
            </span>
          ))}
        </div>

        <ul className="mt-14 grid gap-6 md:grid-cols-3">
          {audienceSection.stakeholders.map((s) => (
            <li key={s.role} className="glass rounded-2xl p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {s.concern}
              </p>
              <h3 className="mt-2 font-display text-lg font-semibold text-foreground">
                {s.role}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {s.outcome}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
