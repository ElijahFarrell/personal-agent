import {
  Code2,
  Cpu,
  Layers,
  Plug,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type ValuePropId,
  valuePropsSection,
} from '@/lib/marketing/copy'

const valuePropIcons: Record<ValuePropId, LucideIcon> = {
  platform: Layers,
  custom: Code2,
  integrations: Plug,
  guardrails: ShieldCheck,
  engineering: Cpu,
  roi: TrendingUp,
}

export function ValueProps() {
  const { heading, subheading, items } = valuePropsSection
  return (
    <section className="relative px-4 py-16 sm:px-6" aria-labelledby="value-heading">
      <div className="mx-auto max-w-6xl">
        <h2
          id="value-heading"
          className="font-display text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl"
        >
          {heading}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          {subheading}
        </p>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ id, title, body }) => {
            const Icon = valuePropIcons[id]
            return (
              <li key={id}>
                <Card className="glass h-full border-border bg-card/40 transition-shadow hover:shadow-lg hover:shadow-brand-500/10">
                  <CardHeader className="pb-2">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-brand-500/25 bg-brand-500/10 text-brand-300">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <CardTitle className="font-display text-lg text-foreground">
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
