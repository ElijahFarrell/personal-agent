'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AuditFormData } from '@/types/audit-form'
import { AI_EXPERIENCE_OPTIONS, BIGGEST_CHALLENGE_OPTIONS } from '@/lib/audit/options'
import { AuditRadioCards } from './AuditRadioCards'

const inputClass =
  'min-h-[120px] border-white/10 bg-white/5 focus-visible:ring-brand-500/50'

export function StagePainGoals({
  data,
  onChange,
}: {
  data: AuditFormData
  onChange: (p: Partial<AuditFormData>) => void
}) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
          Where does it hurt?
        </h2>
        <p className="text-sm text-muted-foreground">
          If you had a magic wand, what would you fix first? This is where we
          find your highest-impact opportunities.
        </p>
      </header>
      <div className="space-y-3">
        <Label>What&apos;s the biggest challenge holding your business back?</Label>
        <AuditRadioCards
          name="biggestChallenge"
          value={data.biggestChallenge}
          onValueChange={(biggestChallenge) => onChange({ biggestChallenge })}
          options={BIGGEST_CHALLENGE_OPTIONS}
        />
        {data.biggestChallenge === 'other' ? (
          <Input
            placeholder="Describe the challenge"
            value={data.biggestChallengeOther}
            onChange={(e) =>
              onChange({ biggestChallengeOther: e.target.value })
            }
            className="border-white/10 bg-white/5"
          />
        ) : null}
      </div>
      <div className="space-y-3">
        <Label>Have you tried using AI in your business before?</Label>
        <AuditRadioCards
          name="aiExperience"
          value={data.aiExperience}
          onValueChange={(aiExperience) => onChange({ aiExperience })}
          options={AI_EXPERIENCE_OPTIONS}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ai-wish">
          If AI could solve ONE problem in your business in the next 30 days,
          what would it be?
        </Label>
        <Textarea
          id="ai-wish"
          placeholder="Dream big — what would change everything for you?"
          value={data.aiWishIn30Days}
          onChange={(e) => onChange({ aiWishIn30Days: e.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  )
}
