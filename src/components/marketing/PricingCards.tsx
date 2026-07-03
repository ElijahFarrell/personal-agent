import Link from 'next/link'
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
import type { PricingTier } from '@/lib/marketing/consulting-copy'

export function PricingCards({ tiers }: { tiers: readonly PricingTier[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {tiers.map((tier, i) => (
        <Card
          key={tier.name}
          className={
            i === 1
              ? 'marketing-card border-brand-300 bg-brand-50/30'
              : 'marketing-card border-border'
          }
        >
          <CardHeader>
            <CardTitle className="font-display text-xl font-normal text-foreground">
              {tier.name}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {tier.description}
            </CardDescription>
            <p className="font-display pt-2 text-2xl tabular-nums text-brand-600">
              {tier.priceRange}
            </p>
            <p className="text-xs text-muted-foreground">{tier.timeline}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-500"
                    aria-hidden
                  />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full rounded-full bg-brand-600 hover:bg-brand-700"
              variant={i === 1 ? 'default' : 'outline'}
              asChild
            >
              <Link href="/audit">Start with free audit</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
