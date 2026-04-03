export const LEGAL_DOC_VERSION = '2026-04-02'

export interface StateCompliancePolicy {
  stateCode: string
  requireVoiceConsent: boolean
  requireSmsConsent: boolean
  callWindowStartHour: number
  callWindowEndHour: number
  requireAiDisclosure: boolean
}

const STRICT_STATES = new Set(['CA', 'FL', 'NY', 'TX'])

export function getDefaultStatePolicy(stateCode?: string): StateCompliancePolicy {
  const code = (stateCode ?? '').toUpperCase()
  const strict = STRICT_STATES.has(code)
  return {
    stateCode: code || 'US',
    requireVoiceConsent: strict,
    requireSmsConsent: true,
    callWindowStartHour: 8,
    callWindowEndHour: 21,
    requireAiDisclosure: true,
  }
}
