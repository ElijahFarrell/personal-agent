'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AUDIT_STORAGE_KEY,
  emptyAuditForm,
  type AuditFormData,
} from '@/types/audit-form'
import { AuditLanding } from './AuditLanding'
import { StageAboutYou } from './StageAboutYou'
import { StageDailyOps } from './StageDailyOps'
import { StageToolStack } from './StageToolStack'
import { StagePainGoals } from './StagePainGoals'
import { StageFinalSubmit } from './StageFinalSubmit'
import { AuditReportDashboard } from './AuditReportDashboard'

const STAGES = 5

function validateStage(stage: number, d: AuditFormData): string | null {
  switch (stage) {
    case 1:
      if (!d.name.trim()) return 'Please enter your name.'
      if (!d.email.trim()) return 'Please enter your email.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))
        return 'Enter a valid email address.'
      if (!d.role) return 'Select your role.'
      if (d.role === 'other' && !d.roleOther.trim())
        return 'Please specify your role.'
      if (!d.teamSize) return 'Select your team size.'
      if (!d.industry) return 'Select your industry.'
      if (d.industry === 'other' && !d.industryOther.trim())
        return 'Please describe your industry.'
      return null
    case 2:
      if (!d.topTasks.trim()) return 'Tell us about your top daily tasks.'
      if (!d.weeklyManualHours) return 'Select hours per week on manual work.'
      if (!d.oneTaskToHandOff.trim())
        return 'What is the one task you would hand off?'
      return null
    case 3:
      if (d.currentTools.length < 1) return 'Select at least one tool.'
      if (d.currentTools.includes('other') && !d.toolsOther.trim())
        return 'Please describe your other tools.'
      if (!d.toolFrustration.trim()) return 'Share your biggest tool frustration.'
      if (!d.offToolProcesses.trim())
        return 'Tell us about processes outside your main tools.'
      return null
    case 4:
      if (!d.biggestChallenge) return 'Select your biggest challenge.'
      if (d.biggestChallenge === 'other' && !d.biggestChallengeOther.trim())
        return 'Please describe your challenge.'
      if (!d.aiExperience) return 'Tell us about your AI experience.'
      if (!d.aiWishIn30Days.trim())
        return 'What should AI solve in the next 30 days?'
      return null
    case 5:
      if (!d.monthlyLeads) return 'Select approximate monthly leads.'
      return null
    default:
      return null
  }
}

export function AuditWizard() {
  const [stage, setStage] = useState(0)
  const [data, setData] = useState<AuditFormData>(emptyAuditForm)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    reportUrl: string
    email: string
    reportMarkdown: string
    hoursSavedPerWeekMin: number | null
    hoursSavedPerWeekMax: number | null
  } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AuditFormData>
        setData((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(data))
      } catch {
        /* ignore */
      }
    }, 500)
    return () => window.clearTimeout(t)
  }, [data])

  const patch = useCallback((p: Partial<AuditFormData>) => {
    setData((prev) => ({ ...prev, ...p }))
    setError(null)
  }, [])

  const progress =
    stage >= 1 && stage <= STAGES ? Math.round((stage / STAGES) * 100) : 0

  async function handleFinalSubmit() {
    const err = validateStage(5, data)
    if (err) {
      setError(err)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/audit/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          role: data.role,
          roleOther: data.roleOther || undefined,
          industry: data.industry,
          industryOther: data.industryOther || undefined,
          teamSize: data.teamSize,
          topTasks: data.topTasks,
          weeklyManualHours: data.weeklyManualHours,
          oneTaskToHandOff: data.oneTaskToHandOff,
          currentTools: data.currentTools,
          toolsOther: data.toolsOther || undefined,
          toolFrustration: data.toolFrustration,
          offToolProcesses: data.offToolProcesses,
          biggestChallenge: data.biggestChallenge,
          biggestChallengeOther: data.biggestChallengeOther || undefined,
          aiExperience: data.aiExperience,
          aiWishIn30Days: data.aiWishIn30Days,
          monthlyLeads: data.monthlyLeads,
          annualRevenue:
            data.annualRevenue === 'prefer_not'
              ? undefined
              : data.annualRevenue || undefined,
        }),
      })
      const json = (await res.json()) as {
        success?: boolean
        reportUrl?: string
        reportMarkdown?: string
        hoursSavedPerWeekMin?: number | null
        hoursSavedPerWeekMax?: number | null
        error?: string
      }
      if (
        !res.ok ||
        !json.success ||
        !json.reportUrl ||
        !json.reportMarkdown
      ) {
        throw new Error(json.error ?? 'Something went wrong. Try again.')
      }
      try {
        localStorage.removeItem(AUDIT_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      setResult({
        reportUrl: json.reportUrl,
        email: data.email.trim(),
        reportMarkdown: json.reportMarkdown,
        hoursSavedPerWeekMin: json.hoursSavedPerWeekMin ?? null,
        hoursSavedPerWeekMax: json.hoursSavedPerWeekMax ?? null,
      })
      setStage(6)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  function next() {
    if (stage >= 1 && stage <= STAGES) {
      const err = validateStage(stage, data)
      if (err) {
        setError(err)
        return
      }
    }
    setError(null)
    if (stage < STAGES) setStage((s) => s + 1)
  }

  function back() {
    setError(null)
    if (stage > 0) setStage((s) => s - 1)
  }

  const linkedIn =
    process.env.NEXT_PUBLIC_LINKEDIN_URL ?? 'https://www.linkedin.com'
  const twitter = process.env.NEXT_PUBLIC_TWITTER_URL ?? 'https://twitter.com'

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      {stage >= 1 && stage <= STAGES ? (
        <div className="mb-8 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Stage {stage} of {STAGES}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress
            value={progress}
            className="h-1.5 bg-white/10 [&>div]:bg-brand-500"
          />
        </div>
      ) : null}

      <div className="glass rounded-2xl border border-white/10 p-6 sm:p-10">
        <AnimatePresence mode="wait">
          {stage === 0 ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <AuditLanding onStart={() => setStage(1)} />
            </motion.div>
          ) : null}

          {stage === 1 ? (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <StageAboutYou data={data} onChange={patch} />
            </motion.div>
          ) : null}

          {stage === 2 ? (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <StageDailyOps data={data} onChange={patch} />
            </motion.div>
          ) : null}

          {stage === 3 ? (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <StageToolStack data={data} onChange={patch} />
            </motion.div>
          ) : null}

          {stage === 4 ? (
            <motion.div
              key="s4"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <StagePainGoals data={data} onChange={patch} />
            </motion.div>
          ) : null}

          {stage === 5 ? (
            <motion.div
              key="s5"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <StageFinalSubmit data={data} onChange={patch} />
            </motion.div>
          ) : null}

          {stage === 6 && result ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <AuditReportDashboard
                email={result.email}
                reportUrl={result.reportUrl}
                reportMarkdown={result.reportMarkdown}
                hoursSavedPerWeekMin={result.hoursSavedPerWeekMin}
                hoursSavedPerWeekMax={result.hoursSavedPerWeekMax}
                linkedInUrl={linkedIn}
                twitterUrl={twitter}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {error ? (
          <p className="mt-6 text-center text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {submitError ? (
          <p className="mt-6 text-center text-sm text-red-400" role="alert">
            {submitError}
          </p>
        ) : null}

        {stage >= 1 && stage <= STAGES ? (
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={back}
              disabled={submitting}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {stage < STAGES ? (
              <Button
                type="button"
                className="rounded-full bg-brand-600 hover:bg-brand-500"
                onClick={next}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-full bg-brand-600 hover:bg-brand-500"
                onClick={handleFinalSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating your report…
                  </>
                ) : (
                  <>
                    Generate My Free AI Audit
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
