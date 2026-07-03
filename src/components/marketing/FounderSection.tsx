import Link from 'next/link'
import { founderHome } from '@/lib/marketing/consulting-copy'

export function FounderSection() {
  return (
    <section
      className="relative px-4 py-20 sm:px-6 sm:py-28"
      aria-labelledby="founder-heading"
    >
      <div className="mx-auto max-w-3xl">
        <div className="marketing-card rounded-xl px-6 py-10 sm:px-10">
          <p className="font-mono-accent text-muted-foreground">Who we are</p>
          <h2
            id="founder-heading"
            className="font-display mt-2 text-2xl text-foreground sm:text-3xl"
          >
            {founderHome.name}
            <span className="block text-lg text-muted-foreground sm:inline sm:pl-2">
              · {founderHome.role}
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {founderHome.bio}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {founderHome.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 font-mono text-[10px] tracking-wider text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
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
