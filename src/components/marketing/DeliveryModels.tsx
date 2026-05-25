import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deliveryModelsSection } from '@/lib/marketing/copy'

export function DeliveryModels() {
  const { heading, subheading, footer, models } = deliveryModelsSection
  return (
    <section
      className="relative px-4 py-16 sm:px-6"
      aria-labelledby="delivery-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <h2
            id="delivery-heading"
            className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            {heading}
          </h2>
          <p className="mt-3 text-muted-foreground">{subheading}</p>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {models.map((m) => (
            <li key={m.id}>
              <Card className="glass h-full border-border bg-gradient-to-br from-card/80 to-card/30">
                <CardHeader>
                  <CardTitle className="font-display text-xl text-foreground">
                    {m.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {m.body}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </section>
  )
}
