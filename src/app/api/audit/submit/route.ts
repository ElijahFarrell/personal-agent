import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { z } from 'zod'
import { api } from '@convex/_generated/api'
import { createAuditAgent } from '@/mastra'
import {
  auditSubmitBodyToIntakePayload,
  formatAuditIntakeUserMessage,
} from '@/lib/audit/intake-payload'
import { getOrCreateIndustryBrief } from '@/lib/audit/industry-research'
import { parseHoursPerWeekFromMarkdown } from '@/lib/audit/parse-metrics'
import { sendAuditReportEmail } from '@/lib/marketing/email'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

/** Mastra agent + Convex can exceed default function limits on cold starts. */
export const maxDuration = 300

const submitSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  role: z.string().min(1).max(100),
  roleOther: z.string().max(500).optional(),
  industry: z.string().min(1).max(100),
  industryOther: z.string().max(200).optional(),
  teamSize: z.string().min(1).max(50),
  topTasks: z.string().trim().min(1).max(8000),
  weeklyManualHours: z.string().min(1).max(50),
  oneTaskToHandOff: z.string().trim().min(1).max(8000),
  currentTools: z.array(z.string()).min(1),
  toolsOther: z.string().max(500).optional(),
  toolFrustration: z.string().trim().min(1).max(8000),
  offToolProcesses: z.string().trim().min(1).max(8000),
  biggestChallenge: z.string().min(1).max(100),
  biggestChallengeOther: z.string().max(500).optional(),
  aiExperience: z.string().min(1).max(100),
  aiWishIn30Days: z.string().trim().min(1).max(8000),
  monthlyLeads: z.string().min(1).max(50),
  annualRevenue: z.string().max(50).optional(),
})

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data
  if (data.role === 'other' && !data.roleOther?.trim()) {
    return NextResponse.json(
      { error: 'Please specify your role' },
      { status: 400 }
    )
  }
  if (data.industry === 'other' && !data.industryOther?.trim()) {
    return NextResponse.json(
      { error: 'Please describe your industry' },
      { status: 400 }
    )
  }
  if (
    data.biggestChallenge === 'other' &&
    !data.biggestChallengeOther?.trim()
  ) {
    return NextResponse.json(
      { error: 'Please describe your biggest challenge' },
      { status: 400 }
    )
  }
  if (data.currentTools.includes('other') && !data.toolsOther?.trim()) {
    return NextResponse.json(
      { error: 'Please describe your other tools' },
      { status: 400 }
    )
  }

  const convex = new ConvexHttpClient(url)

  const { id } = await convex.mutation(api.auditSubmissions.create, {
    name: data.name,
    email: data.email,
    role: data.role,
    roleOther: data.roleOther,
    industry: data.industry,
    industryOther: data.industryOther,
    teamSize: data.teamSize,
    topTasks: data.topTasks,
    weeklyManualHours: data.weeklyManualHours,
    oneTaskToHandOff: data.oneTaskToHandOff,
    currentTools: data.currentTools,
    toolsOther: data.toolsOther,
    toolFrustration: data.toolFrustration,
    offToolProcesses: data.offToolProcesses,
    biggestChallenge: data.biggestChallenge,
    biggestChallengeOther: data.biggestChallengeOther,
    aiExperience: data.aiExperience,
    aiWishIn30Days: data.aiWishIn30Days,
    monthlyLeads: data.monthlyLeads,
    annualRevenue:
      data.annualRevenue && data.annualRevenue !== 'prefer_not'
        ? data.annualRevenue
        : undefined,
  })

  await convex.mutation(api.auditSubmissions.patchReport, {
    id,
    status: 'processing',
  })

  const base = getMarketingSiteUrl()
  const reportUrl = `${base}/api/audit/report/${id}`

  // Industry-aware grounding: read-through cache (7 days). Failures here are
  // non-fatal — we'd rather ship a generic report than block the submission.
  const industryBrief = await getOrCreateIndustryBrief({
    convex,
    industry: data.industry,
    industryOther: data.industryOther,
  }).catch((e) => {
    console.warn('[audit/submit] industry research failed', e)
    return null
  })

  let reportMarkdown = ''
  try {
    const agent = createAuditAgent()
    const payload = auditSubmitBodyToIntakePayload(data)
    const out = await agent.generate(
      formatAuditIntakeUserMessage(payload, new Date(), {
        industryBrief: industryBrief
          ? {
              industryLabel: industryBrief.industryLabel,
              brief: industryBrief.brief,
            }
          : undefined,
      })
    )
    reportMarkdown = (out.text ?? '').trim()
    if (!reportMarkdown) {
      throw new Error('Empty report from model')
    }
  } catch (e) {
    console.error('[audit/submit] report generation failed', e)
    return NextResponse.json(
      {
        error:
          'We could not finish your report just now. Please try again in a moment.',
      },
      { status: 503 }
    )
  }

  const metrics = parseHoursPerWeekFromMarkdown(reportMarkdown)

  await convex.mutation(api.auditSubmissions.patchReport, {
    id,
    status: 'delivered',
    reportUrl,
    reportMarkdown,
    ...(metrics
      ? {
          hoursSavedPerWeekMin: metrics.min,
          hoursSavedPerWeekMax: metrics.max,
        }
      : {}),
  })

  const emailResult = await sendAuditReportEmail({
    to: data.email,
    name: data.name,
    reportUrl,
  })

  return NextResponse.json({
    success: true,
    id: id as string,
    reportUrl,
    reportMarkdown,
    hoursSavedPerWeekMin: metrics?.min ?? null,
    hoursSavedPerWeekMax: metrics?.max ?? null,
    emailSent: emailResult.ok,
    ...(emailResult.ok ? {} : { emailWarning: emailResult.error }),
  })
}
