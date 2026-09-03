import { describe, expect, it } from 'vitest'
import { REPLY_TAG } from '@convex/constants'
import { applyClassificationRules } from '../classify'

const cases: Array<{ name: string; transcript: string; tag: string; decisive?: boolean }> = [
  { name: 'STOP opt-out', transcript: 'STOP', tag: REPLY_TAG.IGNORE, decisive: true },
  { name: 'unsubscribe', transcript: 'please unsubscribe me', tag: REPLY_TAG.IGNORE, decisive: true },
  { name: 'wrong number', transcript: 'wrong number sorry', tag: REPLY_TAG.IGNORE, decisive: true },
  { name: 'not the owner', transcript: 'I am not the owner of that lot', tag: REPLY_TAG.IGNORE, decisive: true },
  { name: 'explicit price', transcript: 'I want $40,000 for it', tag: REPLY_TAG.HUMAN_NOW },
  { name: 'call me', transcript: 'call me this afternoon', tag: REPLY_TAG.HUMAN_NOW },
  { name: 'yes', transcript: 'yes', tag: REPLY_TAG.HUMAN_NOW },
  { name: 'how much', transcript: 'how much will you pay?', tag: REPLY_TAG.HUMAN_NOW },
  { name: 'make me an offer', transcript: 'make me an offer', tag: REPLY_TAG.HUMAN_NOW },
  { name: 'maybe later', transcript: 'maybe later', tag: REPLY_TAG.LATER },
  { name: 'next year', transcript: 'try me next year', tag: REPLY_TAG.LATER },
  { name: 'not right now', transcript: 'not right now', tag: REPLY_TAG.LATER },
  { name: 'contract', transcript: 'send the contract over', tag: REPLY_TAG.DEAL },
  { name: 'title', transcript: 'title is clear', tag: REPLY_TAG.DEAL },
  { name: 'closing', transcript: 'we can do a closing next week', tag: REPLY_TAG.DEAL },
  { name: 'wire', transcript: 'here are the wire instructions', tag: REPLY_TAG.DEAL },
  { name: 'access', transcript: 'you can have access from the county road', tag: REPLY_TAG.DEAL },
]

describe('applyClassificationRules', () => {
  it.each(cases)('$name → $tag', ({ transcript, tag, decisive }) => {
    const result = applyClassificationRules(transcript)
    expect(result.tag).toBe(tag)
    if (decisive) expect(result.decisive).toBe(true)
  })
})
