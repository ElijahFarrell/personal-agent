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
import { appSignUpUrl } from '@/lib/marketing/site'

const tiers = [
  {
    name: 'Starter',
    price: 'Custom',
    description: 'Pilot with one team — core agents and inbox.',
    features: [
      'Lead qualification agent',
      'Unified inbox (connected integrations)',
      'Basic workflows',
      'Email support',
    ],
    highlighted: false,
  },
  {
    name: 'Growth',
    price: 'Custom',
    description: 'Brokerage-wide rollout — automation + governance.',
    features: [
      'Everything in Starter',
      'Reactivation + outreach agents',
      'CRM workflow automation',
      'Voice automation patterns',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'SSO, audit, and bespoke integrations.',
    features: [
      'Everything in Growth',
      'Custom agents & integrations',
      'Security review support',
      'Dedicated success',
    ],
    highlighted: false,
  },
] as const

export function PricingCards() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
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
              <a href={appSignUpUrl()}>Talk to us</a>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
