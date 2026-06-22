import { benefitsSection } from '@/lib/marketing/asc-copy'
import { SectionHeader } from './SectionHeader'

export function AscBenefits() {
  return (
    <section
      className="marketing-section relative border-y border-border/60 bg-card/30 px-4 py-16 sm:px-6 sm:py-24"
      aria-labelledby="benefits-heading"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          id="benefits-heading"
          title={benefitsSection.heading}
          subtitle={benefitsSection.subheading}
        />

        <ul className="mt-14 grid gap-6 lg:grid-cols-3">
          {benefitsSection.items.map((item) => (
            <li
              key={item.title}
              className="glass group rounded-2xl p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {item.stakeholder}
              </p>
              <h3 className="mt-3 font-display text-xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
