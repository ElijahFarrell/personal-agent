import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { platformCapabilitiesSection } from '@/lib/marketing/copy'

export function PlatformCapabilities() {
  const { badge, heading, subheading, items } = platformCapabilitiesSection
  return (
    <section
      className="relative px-4 py-16 sm:px-6"
      aria-labelledby="platform-cap-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <Badge
            variant="secondary"
            className="mb-4 border border-brand-500/20 bg-brand-500/10 text-brand-700"
          >
            {badge}
          </Badge>
          <h2
            id="platform-cap-heading"
            className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            {heading}
          </h2>
          <p className="mt-3 text-muted-foreground">{subheading}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.title}>
              <Card className="glass h-full border-border bg-card/40">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg text-foreground">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
