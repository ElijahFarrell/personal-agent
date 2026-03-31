import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { credibilityBadges } from '@/lib/marketing/copy'
import { cn } from '@/lib/utils'

export function FounderSection() {
  return (
    <section
      className="relative px-4 py-16 sm:px-6"
      aria-label="Trust and credentials"
    >
      <div className="mx-auto max-w-6xl">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {credibilityBadges.map((badge, i) => (
            <li
              key={badge.title}
              className={cn(
                'min-w-0',
                i < 3 && 'lg:col-span-2',
                i === 3 && 'lg:col-span-2 lg:col-start-2',
                i === 4 && 'lg:col-span-2 lg:col-start-4'
              )}
            >
              <Card className="glass h-full border-white/10">
                <CardContent className="pt-6">
                  <Badge
                    variant="secondary"
                    className="mb-3 border border-brand-500/20 bg-brand-500/10 text-brand-200"
                  >
                    {badge.title}
                  </Badge>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {badge.description}
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
