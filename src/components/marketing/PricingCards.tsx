import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { bookCallUrl } from '@/lib/marketing/site'

const tiers = [
  {
    name: 'AI Audit',
    price: 'Custom',
    description: 'Fixed-scope discovery and a prioritized roadmap.',
    features: [
      'Workflow and ROI mapping',
      'Platform vs. integration recommendation',
      'Prioritized build plan',
      'Written deliverables',
    ],
    highlighted: false,
  },
  {
    name: 'Platform deployment',
    price: 'Custom',
    description: 'Tailored rollout of the Shiloh platform for your team.',
    features: [
      'Branding and configuration',
      'Core agents and workflows',
      'CRM and channel integrations',
      'Go-live support',
    ],
    highlighted: true,
  },
  {
    name: 'Custom integration',
    price: 'Custom',
    description: 'AI agents and automations inside your existing stack.',
    features: [
      'HubSpot, Salesforce, FUB, Gmail, Slack, Twilio, and more',
      'Guardrails and approvals',
      'Production hardening',
      'Handoff documentation',
    ],
    highlighted: false,
  },
  {
    name: 'Ongoing partner',
    price: 'Custom',
    description: 'Fractional AI — ship iterations and expand use cases.',
    features: [
      'Monthly roadmap and prioritization',
      'Quality monitoring',
      'New workflows and agents',
      'Direct access to your consultant',
    ],
    highlighted: false,
  },
] as const

export function PricingCards() {
  const book = bookCallUrl()
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {tiers.map((tier) => (
        <Card
          key={tier.name}
          className={
            tier.highlighted
              ? 'glass border-brand-500/40 bg-brand-950/20 shadow-xl shadow-brand-500/10'
              : 'glass border-white/10'
          }
        >
          <CardHeader>
            <CardTitle className="font-display text-2xl text-white">
              {tier.name}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {tier.description}
            </CardDescription>
            <p className="font-display pt-2 text-3xl font-bold text-white">
              {tier.price}
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-400"
                    aria-hidden
                  />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full rounded-full bg-brand-600 hover:bg-brand-500"
              variant={tier.highlighted ? 'default' : 'outline'}
              asChild
            >
              <a href={book} target="_blank" rel="noopener noreferrer">
                Talk to us
              </a>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
