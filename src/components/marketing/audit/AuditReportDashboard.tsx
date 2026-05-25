'use client'

import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MessageResponse } from '@/components/ai-elements/message'
import { bookCallUrl } from '@/lib/marketing/site'

export function AuditReportDashboard({
  email,
  reportMarkdown,
  reportUrl,
  hoursSavedPerWeekMin,
  hoursSavedPerWeekMax,
  linkedInUrl,
  twitterUrl,
}: {
  email: string
  reportMarkdown: string
  reportUrl: string
  hoursSavedPerWeekMin: number | null
  hoursSavedPerWeekMax: number | null
  linkedInUrl?: string
  twitterUrl?: string
}) {
  const li = linkedInUrl ?? '#'
  const tw = twitterUrl ?? '#'
  const book = bookCallUrl()

  const hasHours =
    hoursSavedPerWeekMin != null &&
    hoursSavedPerWeekMax != null &&
    hoursSavedPerWeekMax >= hoursSavedPerWeekMin

  const yearLo = hasHours ? hoursSavedPerWeekMin! * 52 : null
  const yearHi = hasHours ? hoursSavedPerWeekMax! * 52 : null

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
          You&apos;re in
        </h2>
        <p className="text-lg text-muted-foreground">
          Your personalized AI Audit is ready. We also emailed it to{' '}
          <span className="font-medium text-brand-700">{email}</span>.
        </p>
      </div>

      {hasHours ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="glass border-border shadow-sm">
            <CardContent className="space-y-1 p-6 pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
                Est. time back
              </p>
              <p className="font-display text-3xl font-semibold tabular-nums text-foreground md:text-4xl">
                {hoursSavedPerWeekMin}–{hoursSavedPerWeekMax}{' '}
                <span className="text-lg font-semibold text-muted-foreground">
                  hrs/wk
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Conservative range from your audit
              </p>
            </CardContent>
          </Card>
          <Card className="glass border-border shadow-sm">
            <CardContent className="space-y-1 p-6 pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
                Annualized
              </p>
              <p className="font-display text-3xl font-semibold tabular-nums text-foreground md:text-4xl">
                {yearLo!.toLocaleString()}–{yearHi!.toLocaleString()}{' '}
                <span className="text-lg font-semibold text-muted-foreground">
                  hrs/yr
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Time you could reinvest in deals & relationships
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="glass rounded-xl border border-border bg-card p-5 sm:p-8">
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
          Your report
        </h3>
        <div className="max-h-[min(70vh,720px)] overflow-y-auto pr-1 text-left">
          <MessageResponse className="text-sm leading-relaxed text-foreground [&_a]:text-brand-600 [&_h1]:font-display [&_h1]:text-2xl [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h3]:font-display [&_table]:text-xs [&_th]:text-brand-700">
            {reportMarkdown}
          </MessageResponse>
        </div>
      </div>

      <ul className="mx-auto max-w-md space-y-2 text-left text-sm text-muted-foreground">
        <li>Your top AI automation opportunities, ranked by impact</li>
        <li>Estimated hours you can reclaim per week</li>
        <li>A prioritized action plan you can start immediately</li>
      </ul>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          size="lg"
          className="h-12 rounded-full bg-brand-600 px-8 text-white hover:bg-brand-700"
          asChild
        >
          <a href={reportUrl} target="_blank" rel="noopener noreferrer">
            Open printable report
          </a>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 rounded-full border-border px-8"
          asChild
        >
          <a href={book} target="_blank" rel="noopener noreferrer">
            Book a call
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Follow our journey on{' '}
        <a
          href={li}
          className="text-brand-600 underline-offset-4 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>{' '}
        or{' '}
        <a
          href={tw}
          className="text-brand-600 underline-offset-4 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          X (Twitter)
        </a>
        .
      </p>
    </div>
  )
}
