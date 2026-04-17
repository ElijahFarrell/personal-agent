import type { AuditFormData } from '@/types/audit-form'

/**
 * Canonical JSON shape for the Shiloh AI Audit Agent (matches prompt contract).
 * Maps from `AuditFormData` / Convex `auditSubmissions` field names.
 */
export type AuditIntakePayload = {
  name: string
  email: string
  role: string
  roleOther?: string
  industry: string
  industryOther?: string
  teamSize: string
  topDailyTasks: string
  weeklyRepetitiveHours: string
  taskToHandOff: string
  currentTools: string[]
  toolsOther?: string
  toolFrustrations: string
  processesOutsideTools: string
  biggestChallenge: string
  biggestChallengeOther?: string
  aiExperience: string
  oneAIProblemToSolve: string
  monthlyLeadVolume: string
  annualRevenue?: string
}

export function toAuditIntakePayload(data: AuditFormData): AuditIntakePayload {
  const payload: AuditIntakePayload = {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role,
    industry: data.industry,
    teamSize: data.teamSize,
    topDailyTasks: data.topTasks.trim(),
    weeklyRepetitiveHours: data.weeklyManualHours,
    taskToHandOff: data.oneTaskToHandOff.trim(),
    currentTools: [...data.currentTools],
    toolFrustrations: data.toolFrustration.trim(),
    processesOutsideTools: data.offToolProcesses.trim(),
    biggestChallenge: data.biggestChallenge,
    aiExperience: data.aiExperience,
    oneAIProblemToSolve: data.aiWishIn30Days.trim(),
    monthlyLeadVolume: data.monthlyLeads,
  }
  const ro = data.roleOther?.trim()
  if (ro) payload.roleOther = ro
  const io = data.industryOther?.trim()
  if (io) payload.industryOther = io
  const to = data.toolsOther?.trim()
  if (to) payload.toolsOther = to
  const bco = data.biggestChallengeOther?.trim()
  if (bco) payload.biggestChallengeOther = bco
  if (data.annualRevenue && data.annualRevenue !== 'prefer_not') {
    payload.annualRevenue = data.annualRevenue
  }
  return payload
}

/**
 * Server-side wall-clock for the audit report. Uses UTC labels (Vercel default).
 * Pass a fixed `Date` in tests.
 */
export function formatAuditReportTimestampLines(at: Date = new Date()): {
  iso: string
  /** Full line for **Date:** in the report (date + time + zone). */
  reportDateLine: string
} {
  const iso = at.toISOString()
  const dateOnly = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(at)
  const timeWithZone = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(at)
  return {
    iso,
    reportDateLine: `${dateOnly} · ${timeWithZone}`,
  }
}

/**
 * Optional industry research brief (Tavily-backed, 7-day cache) injected as
 * grounding context for the audit agent. Pass `undefined` to skip the section.
 */
export type AuditUserMessageContext = {
  industryBrief?: {
    industryLabel: string
    brief: string
  }
}

/** User message body for \`generateText\` / Mastra agent runs. */
export function formatAuditIntakeUserMessage(
  payload: AuditIntakePayload,
  generatedAt: Date = new Date(),
  context: AuditUserMessageContext = {}
): string {
  const { iso, reportDateLine } = formatAuditReportTimestampLines(generatedAt)
  const briefBlock = context.industryBrief
    ? `

**Industry Research Brief (additional grounding — internal use, do NOT quote verbatim or expose URLs to the reader):**

\`\`\`md
${context.industryBrief.brief}
\`\`\`
`
    : ''

  return `Generate the personalized AI Audit Report from this intake JSON.

**Report timestamp (authoritative — use this for the report header; do NOT use any other date or time, including from training data, examples, or memory):**
- ISO 8601: ${iso}
- **Date (use this exact string after "Date:" in the report):** ${reportDateLine}

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`${briefBlock}`
}

/** Maps POST /api/audit/submit body fields to agent intake JSON. */
export function auditSubmitBodyToIntakePayload(data: {
  name: string
  email: string
  role: string
  roleOther?: string
  industry: string
  industryOther?: string
  teamSize: string
  topTasks: string
  weeklyManualHours: string
  oneTaskToHandOff: string
  currentTools: string[]
  toolsOther?: string
  toolFrustration: string
  offToolProcesses: string
  biggestChallenge: string
  biggestChallengeOther?: string
  aiExperience: string
  aiWishIn30Days: string
  monthlyLeads: string
  annualRevenue?: string
}): AuditIntakePayload {
  const payload: AuditIntakePayload = {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role,
    industry: data.industry,
    teamSize: data.teamSize,
    topDailyTasks: data.topTasks.trim(),
    weeklyRepetitiveHours: data.weeklyManualHours,
    taskToHandOff: data.oneTaskToHandOff.trim(),
    currentTools: [...data.currentTools],
    toolFrustrations: data.toolFrustration.trim(),
    processesOutsideTools: data.offToolProcesses.trim(),
    biggestChallenge: data.biggestChallenge,
    aiExperience: data.aiExperience,
    oneAIProblemToSolve: data.aiWishIn30Days.trim(),
    monthlyLeadVolume: data.monthlyLeads,
  }
  const ro = data.roleOther?.trim()
  if (ro) payload.roleOther = ro
  const io = data.industryOther?.trim()
  if (io) payload.industryOther = io
  const to = data.toolsOther?.trim()
  if (to) payload.toolsOther = to
  const bco = data.biggestChallengeOther?.trim()
  if (bco) payload.biggestChallengeOther = bco
  if (data.annualRevenue?.trim()) {
    payload.annualRevenue = data.annualRevenue.trim()
  }
  return payload
}
