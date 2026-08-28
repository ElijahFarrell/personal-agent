import { Shield } from 'lucide-react'
import { guaranteeSection } from '@/lib/marketing/asc-copy'

export function GuaranteeSection() {
  return (
    <section
      className="marketing-section relative px-4 py-16 sm:px-6 sm:py-20"
      aria-labelledby="guarantee-heading"
    >
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border-2 border-brand-500/25 bg-gradient-to-br from-brand-50 via-card to-card px-6 py-10 sm:px-10 sm:py-12">
          <div
            className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-200/40 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-background">
              <Shield className="h-7 w-7" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">
                {guaranteeSection.badge}
              </p>
              <h2
                id="guarantee-heading"
                className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl"
              >
                {guaranteeSection.heading}
              </h2>
              <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
                {guaranteeSection.body}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
