import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { homeServicesTeaser } from '@/lib/marketing/copy'

export function HomeServicesTeaser() {
  const { heading, body, href, label } = homeServicesTeaser
  return (
    <section className="relative px-4 py-12 sm:px-6" aria-label="Services">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {heading}
        </h2>
        <p className="mt-3 text-muted-foreground">{body}</p>
        <Link
          href={href}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          {label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
