import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { bookCallUrl } from '@/lib/marketing/site'

export function CTASection() {
  return (
    <section
      className="relative px-4 py-20 sm:px-6"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-4xl">
        <div className="glass relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-900/40 via-card/50 to-background px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.25),_transparent_65%)]"
          />
          <div className="relative">
            <h2
              id="cta-heading"
              className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl"
            >
              Find out where AI can save you 10+ hours a week
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Get your free AI Audit — personalized opportunities, time savings,
              and a clear action plan for your real estate business.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="h-12 rounded-full bg-white px-8 text-base font-semibold text-brand-900 shadow-xl hover:bg-white/90"
                asChild
              >
                <a href="/audit" className="gap-2">
                  Get your free AI audit
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
              <p className="text-sm text-muted-foreground">
                or{' '}
                <Link
                  href={bookCallUrl()}
                  className="font-medium text-brand-300 underline-offset-4 hover:text-brand-200 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  book a call
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
