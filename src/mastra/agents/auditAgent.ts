/**
 * Stateless agent for generating Free AI Audit reports from intake JSON.
 * Invoked from API routes or workflows — no per-user memory or tools.
 *
 * @example
 * ```ts
 * import { createAuditAgent } from '@/mastra'
 * import {
 *   formatAuditIntakeUserMessage,
 *   toAuditIntakePayload,
 * } from '@/lib/audit/intake-payload'
 * const agent = createAuditAgent()
 * const payload = toAuditIntakePayload(formData)
 * const out = await agent.generate(formatAuditIntakeUserMessage(payload))
 * // out.text — markdown report
 * ```
 */
import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { bookCallUrl } from '@/lib/marketing/site'
import { buildAuditReportSystemPrompt } from '../prompts/auditAgent'
import { AGENT_META, getAgentSchemas } from './schemas'

export const AUDIT_REPORT_AGENT_SCHEMAS = getAgentSchemas('auditReport')

export function createAuditAgent(): Agent {
  return new Agent({
    id: 'shiloh-audit-report',
    name: 'auditReport',
    description: AGENT_META.auditReport.description,
    instructions: buildAuditReportSystemPrompt(bookCallUrl()),
    model: AgentModels.audit(),
  })
}
