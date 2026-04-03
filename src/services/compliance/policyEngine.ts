import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { COMPLIANCE_CHANNEL, COMPLIANCE_DECISION } from '@convex/constants'
import { getDefaultStatePolicy } from '@/constants/compliancePolicies'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

type ComplianceChannel = (typeof COMPLIANCE_CHANNEL)[keyof typeof COMPLIANCE_CHANNEL]

export interface CompliancePreflightInput {
  tenantId: Id<'tenants'>
  userId?: Id<'users'>
  workflowRunId?: Id<'workflowRuns'>
  channel: ComplianceChannel
  phone: string
  timezone?: string
  stateCode?: string
  payload?: Record<string, unknown>
}

export interface CompliancePreflightResult {
  allowed: boolean
  reasonCodes: string[]
  policyVersion: string
  disclosureRequired: boolean
  optOutRequired: boolean
  normalizedPhone: string
}

export async function evaluateCompliancePreflight(
  input: CompliancePreflightInput
): Promise<CompliancePreflightResult> {
  const policy = getDefaultStatePolicy(input.stateCode)
  const result = await convex.query((api as any).compliance.checkOutboundPreflight, {
    tenantId: input.tenantId,
    channel: input.channel,
    phone: input.phone,
    timezone: input.timezone,
    stateCode: policy.stateCode,
    nowMs: Date.now(),
    requireConsentForVoice: policy.requireVoiceConsent,
    forceDisclosure: policy.requireAiDisclosure,
  })

  await convex.mutation((api as any).compliance.logAuditEvent, {
    webhookSecret: process.env.INTERNAL_WEBHOOK_SECRET,
    tenantId: input.tenantId,
    userId: input.userId,
    workflowRunId: input.workflowRunId,
    channel: input.channel,
    phone: result.normalizedPhone,
    timezone: input.timezone,
    stateCode: policy.stateCode,
    policyVersion: result.policyVersion,
    decision: result.allowed ? COMPLIANCE_DECISION.ALLOW : COMPLIANCE_DECISION.BLOCK,
    reasonCodes: result.reasonCodes,
    payload: input.payload,
  })

  return result
}

export async function assertComplianceOrThrow(input: CompliancePreflightInput) {
  if (input.channel === COMPLIANCE_CHANNEL.VOICE_CALL) {
    const fromNumber = input.payload?.from_number ?? input.payload?.from
    if (typeof fromNumber === 'string' && !fromNumber.startsWith('+')) {
      throw new Error('Compliance check blocked outreach: INVALID_CALLER_ID')
    }
  }
  const health = await convex.query((api as any).compliance.getTenantComplianceHealth, {
    tenantId: input.tenantId,
    nowMs: Date.now(),
  })
  if (health.suspended) {
    throw new Error('Outbound suspended due to repeated compliance violations')
  }
  const result = await evaluateCompliancePreflight(input)
  if (!result.allowed) {
    throw new Error(`Compliance check blocked outreach: ${result.reasonCodes.join(', ')}`)
  }
  return result
}

export async function registerSuppressionFromOptOut(args: {
  tenantId: Id<'tenants'>
  phone: string
  source: string
}) {
  await convex.mutation((api as any).compliance.upsertSuppressionEntry, {
    webhookSecret: process.env.INTERNAL_WEBHOOK_SECRET,
    tenantId: args.tenantId,
    phone: args.phone,
    channel: COMPLIANCE_CHANNEL.SMS,
    reason: 'optout',
    source: args.source,
    active: true,
  })
}
