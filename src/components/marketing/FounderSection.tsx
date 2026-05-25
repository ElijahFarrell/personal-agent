import Link from 'next/link'
import { founderHome } from '@/lib/marketing/copy'

export function FounderSection() {
  return (
    <section
      className="relative px-4 py-16 sm:px-6"
      aria-labelledby="founder-heading"
    >
      <div className="mx-auto max-w-3xl">
        <div className="glass rounded-2xl border border-border bg-card px-6 py-10 sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            Who builds this
          </p>
          <h2
            id="founder-heading"
            className="font-display mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            {founderHome.name}
            <span className="block text-lg font-normal text-muted-foreground sm:inline sm:pl-2 sm:text-xl">
              · {founderHome.role}
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {founderHome.bio}
          </p>
          <p className="mt-3 text-sm font-medium text-foreground">
            {founderHome.credential}
          </p>
          <ul className="mt-6 space-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
            {founderHome.highlights.map((line) => (
              <li key={line} className="flex gap-2 leading-relaxed">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-500" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
          <Link
            href="/about"
            className="mt-8 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Full story →
          </Link>
        </div>
      </div>
    </section>
  )
}
