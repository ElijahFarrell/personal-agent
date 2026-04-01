import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const agents = [
  {
    name: 'Lead qualification',
    blurb: 'Budget, timeline, pre-approval — scored and synced to CRM automatically.',
  },
  {
    name: 'Lead reactivation',
    blurb: 'Wake dormant contacts with contextual outreach from your history and listings.',
  },
  {
    name: 'Property research',
    blurb: 'Comps, neighborhood snapshots, and talking points on demand.',
  },
  {
    name: 'Multichannel outreach',
    blurb: 'Email, SMS, and social follow-ups with brand-safe templates and approvals.',
  },
] as const

export function AgentShowcase() {
  return (
    <section
      className="relative px-4 py-16 sm:px-6"
      aria-labelledby="agents-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <Badge
            variant="secondary"
            className="mb-4 border border-brand-500/20 bg-brand-500/10 text-brand-200"
          >
            Agent catalog
          </Badge>
          <h2
            id="agents-heading"
            className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl"
          >
            Specialized agents, one OS
          </h2>
          <p className="mt-3 text-muted-foreground">
            Mix and match agents for your brokerage — same memory, same
            workflows, same guardrails.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((a) => (
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
