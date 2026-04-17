import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { engagementsCatalog } from '@/lib/marketing/copy'

export function AgentShowcase() {
  const { badge, heading, subheading, items } = engagementsCatalog
  return (
    <section
      className="relative px-4 py-16 sm:px-6"
      aria-labelledby="engagements-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <Badge
            variant="secondary"
            className="mb-4 border border-brand-500/20 bg-brand-500/10 text-brand-200"
          >
            {badge}
          </Badge>
          <h2
            id="engagements-heading"
            className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl"
          >
            {heading}
          </h2>
          <p className="mt-3 text-muted-foreground">{subheading}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((a) => (
            <Card
              key={a.name}
              className="glass border-white/10 bg-gradient-to-br from-card/80 to-card/30"
            >
              <CardHeader>
                <CardTitle className="font-display text-xl text-white">
                  {a.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{a.blurb}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
