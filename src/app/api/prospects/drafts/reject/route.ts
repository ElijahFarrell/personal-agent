import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { getTenantContext, httpStatusForError } from '@/middleware/tenantContext'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/prospects/drafts/reject — reject a draft. Prospect stays at draft_ready.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getTenantContext()

    const { draftId } = (await req.json()) as { draftId?: string }
    if (!draftId) {
      return NextResponse.json({ error: 'draftId is required' }, { status: 400 })
    }

    const draft = await convex.query(api.prospects.getDraft, {
      draftId: draftId as Id<'outreachDrafts'>,
    })
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (draft.tenantId !== dbUser.tenantId) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    await convex.mutation(api.prospects.updateDraftStatus, {
      draftId: draftId as Id<'outreachDrafts'>,
      status: 'rejected',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Draft Reject] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: httpStatusForError(error) })
  }
}
