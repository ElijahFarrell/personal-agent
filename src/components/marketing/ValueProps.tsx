import {
  Bot,
  Inbox,
  Layers,
  Phone,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const items = [
  {
    icon: Zap,
    title: 'Speed to lead',
    body: 'Qualify inbound leads in seconds across channels — so your team talks to ready buyers first.',
  },
  {
    icon: Layers,
    title: 'One intelligence layer',
    body: 'CRM, email, SMS, and social finally share context. Fewer tools, fewer dropped handoffs.',
  },
  {
    icon: RefreshCw,
    title: 'Follow-up that does not slip',
    body: 'Always-on sequences and reactivation for cold leads — personalized from live CRM context.',
  },
  {
    icon: Bot,
    title: 'Agents that take action',
    body: 'Research, drafts, CRM updates, and outreach — with guardrails and auditability.',
  },
  {
    icon: Inbox,
    title: 'Unified inbox',
    body: 'Email, SMS, DMs, and calls in one place with AI triage and next-best-action.',
  },
  {
    icon: Phone,
    title: 'AI voice',
    body: 'AI receptionist workflows that qualify callers, answer FAQs, and book appointments.',
  },
] as const

export function ValueProps() {
  return (
    <section className="relative px-4 py-16 sm:px-6" aria-labelledby="value-heading">
      <div className="mx-auto max-w-6xl">
        <h2
          id="value-heading"
          className="font-display text-center text-3xl font-bold tracking-tight text-white md:text-4xl"
        >
          Built for teams drowning in leads
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Shiloh AI OS connects your stack and runs the busywork — so agents
          spend time on relationships and revenue.
        </p>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Card className="glass h-full border-white/10 bg-card/40 transition-shadow hover:shadow-lg hover:shadow-brand-500/10">
                <CardHeader className="pb-2">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-brand-500/25 bg-brand-500/10 text-brand-300">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <CardTitle className="font-display text-lg text-white">
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
          ))}
        </ul>
      </div>
    </section>
  )
}
