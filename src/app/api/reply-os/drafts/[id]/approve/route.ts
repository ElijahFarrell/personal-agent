import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'
import { approveReplyDraft } from '@/services/replyOs/send'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, config } = await getTenantContext()
    if (!isFeatureEnabled(config, 'sellerReplyOs')) {
      return NextResponse.json(
        { error: 'Seller Reply OS is not enabled.' },
        { status: 403 }
      )
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const { id } = await params
    const draftId = id as Id<'replyDrafts'>
    const draft = await convex.query(api.replyDrafts.getById, { draftId })
    if (!draft || draft.tenantId !== dbUser.tenantId) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const body = (await req.json().catch(() => ({}))) as { editedBody?: string }
    const result = await approveReplyDraft({
      tenantId: dbUser.tenantId,
      clerkUserId: userId,
      draftId,
      editedBody: typeof body.editedBody === 'string' ? body.editedBody : undefined,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to approve draft'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
