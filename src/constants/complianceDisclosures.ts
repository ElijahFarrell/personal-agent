export const DEFAULT_AI_DISCLOSURE =
  'Hi, this is an AI-generated voice assistant calling on behalf of our team.'

export const DEFAULT_CALLBACK_DISCLOSURE =
  'You can call us back at the number shown on your caller ID.'

export const DEFAULT_OPTOUT_PROMPT =
  'To opt out of future outreach, say opt out now.'

export function withMandatoryVoiceDisclosures(script?: string): string {
  const base = (script ?? '').trim()
  const parts = [
    DEFAULT_AI_DISCLOSURE,
    DEFAULT_CALLBACK_DISCLOSURE,
    DEFAULT_OPTOUT_PROMPT,
    base,
  ].filter(Boolean)
  return parts.join(' ')
}

export function withMandatorySmsOptOut(message: string): string {
  const trimmed = message.trim()
  if (/reply\s+stop\s+to\s+opt\s*out/i.test(trimmed)) {
    return trimmed
  }
  return `${trimmed} Reply STOP to opt out.`
}
