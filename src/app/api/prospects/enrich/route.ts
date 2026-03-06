import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { getTenantContext } from '@/middleware/tenantContext'
import { executeProspectEnrichment } from '@/mastra/workflows/prospectEnrichment'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const BATCH_CONCURRENCY = 3

interface EnrichRequestBody {
  prospectId?: string
  prospectIds?: string[]
  campaignContext?: string
  channel?: 'linkedin' | 'email' | 'instagram'
}

async function enrichSingleProspect(
  prospectId: Id<'prospects'>,
  userId: string,
  campaignContext: string,
  channel: 'linkedin' | 'email' | 'instagram'
): Promise<{ prospectId: string; success: boolean; error?: string }> {
  try {
    const prospect = await convex.query(api.prospects.getProspect, { prospectId })
    if (!prospect) return { prospectId, success: false, error: 'Prospect not found' }

    await convex.mutation(api.prospects.updateProspect, { prospectId, status: 'researching' })

    const result = await executeProspectEnrichment({
      userId,
      prospectName: prospect.name,
      company: prospect.company,
      linkedinUrl: prospect.linkedinUrl,
      websiteUrl: prospect.websiteUrl,
      campaignContext,
      channel,
    })

    await convex.mutation(api.prospects.upsertResearchSnapshot, {
      prospectId,
      tenantId: prospect.tenantId,
      linkedinProfile: result.linkedinProfile,
      companyInfo: result.companyInfo,
      newsArticles: result.newsArticles,
      personalizationAngles: result.personalizationAngles,
    })

    await convex.mutation(api.prospects.createDraft, {
      prospectId,
      tenantId: prospect.tenantId,
      channel,
      subject: result.draftSubject,
      body: result.draftBody,
    })

    await convex.mutation(api.prospects.updateProspect, { prospectId, status: 'draft_ready' })

    return { prospectId, success: true }
  } catch (error) {
    console.error(`[Enrich API] Error enriching ${prospectId}:`, error)
    try {
      await convex.mutation(api.prospects.updateProspect, { prospectId, status: 'new' })
    } catch { /* best-effort rollback */ }
    return {
      prospectId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process an array of prospect IDs in batches to avoid hammering APIs.
 */
async function enrichBatch(
  ids: Id<'prospects'>[],
  userId: string,
  campaignContext: string,
  channel: 'linkedin' | 'email' | 'instagram'
) {
  const results: Array<{ prospectId: string; success: boolean; error?: string }> = []

  for (let i = 0; i < ids.length; i += BATCH_CONCURRENCY) {
    const chunk = ids.slice(i, i + BATCH_CONCURRENCY)
    const settled = await Promise.allSettled(
      chunk.map((id) => enrichSingleProspect(id, userId, campaignContext, channel))
    )
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        results.push(s.value)
      } else {
        results.push({ prospectId: 'unknown', success: false, error: s.reason?.message ?? 'Unknown error' })
      }
    }
  }

  return results
}

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()
    const { userId } = tenantCtx

    const body = (await req.json()) as Partial<EnrichRequestBody>
    const { prospectId, prospectIds, campaignContext = '', channel = 'linkedin' } = body

    if (prospectIds && Array.isArray(prospectIds) && prospectIds.length > 0) {
      const ids = prospectIds as Id<'prospects'>[]
      const results = await enrichBatch(ids, userId, campaignContext, channel)
      return NextResponse.json({ results })
    }

    if (!prospectId) {
      return NextResponse.json({ error: 'prospectId or prospectIds is required' }, { status: 400 })
    }

    const result = await enrichSingleProspect(
      prospectId as Id<'prospects'>,
      userId,
      campaignContext,
      channel
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const prospect = await convex.query(api.prospects.getProspect, {
      prospectId: prospectId as Id<'prospects'>,
    })

    const snapshot = prospect
      ? await convex.query(api.prospects.getResearchSnapshot, {
          prospectId: prospectId as Id<'prospects'>,
        })
      : null

    return NextResponse.json({
      success: true,
      personalizationAngles: snapshot?.personalizationAngles,
    })
  } catch (error) {
    console.error('[Enrich API] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
