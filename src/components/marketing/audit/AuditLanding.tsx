import Link from 'next/link'
import { ArrowRight, Clock, CreditCard, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AuditLanding({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <p className="font-mono-accent text-brand-600">Free diagnostic</p>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Find out exactly where AI can save you 10+ hours a week
        </h1>
        <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
          Answer a few questions about how your business runs today. We&apos;ll
          send a personalized report of likely opportunities — then you choose
          no build, a 15-minute fit call, or a paid readiness audit.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        className="h-12 rounded-md bg-brand-600 px-8 text-base font-semibold text-background shadow-md shadow-brand-600/20 hover:bg-brand-700"
        onClick={onStart}
      >
        Start my free audit
        <ArrowRight className="h-4 w-4" />
      </Button>
      <ul className="mx-auto flex max-w-md flex-col gap-3 text-left text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-center sm:gap-6">
        <li className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-brand-600" />
          Takes ~5 minutes
        </li>
        <li className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 shrink-0 text-brand-600" />
          No credit card required
        </li>
        <li className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-brand-600" />
          Report in your inbox within minutes
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">
        This is a diagnostic, not the paid AI Readiness Audit.{' '}
        <Link href="/blog/ai-readiness-audit-process-cost" className="font-medium text-brand-600 hover:text-brand-700">
          Process, deliverables, and cost
        </Link>
        {' · '}
        <Link href="/work/grant-writing-automation" className="font-medium text-brand-600 hover:text-brand-700">
          Measured grant outcomes
        </Link>
      </p>
    </div>
  )
}
