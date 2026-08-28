import { ArrowRight, Clock, CreditCard, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AuditLanding({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Find out exactly where AI can save you 10+ hours a week
        </h1>
        <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
          Answer a few questions about how your business runs today. We&apos;ll
          send you a personalized AI Audit Report showing your biggest automation
          opportunities, estimated time savings, and a clear action plan —
          completely free.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        className="h-12 rounded-full bg-brand-600 px-8 text-base font-semibold text-background shadow-md shadow-brand-600/20 hover:bg-brand-700"
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
    </div>
  )
}
