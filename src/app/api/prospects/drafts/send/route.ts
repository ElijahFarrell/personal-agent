import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { getTenantContext } from '@/middleware/tenantContext'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { sendDM as sendLinkedInDM } from '@/services/linkedinService'
import { send as sendEmail } from '@/services/gmailService'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/prospects/drafts/send — send an approved draft via the channel's service.
 * Only approved drafts can be sent. Records outcome (success/failure) in the DB.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()

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
    if (draft.status !== 'approved') {
      return NextResponse.json(
        { error: `Draft must be approved before sending (current: ${draft.status})` },
        { status: 400 }
      )
    }

    const prospect = await convex.query(api.prospects.getProspect, {
      prospectId: draft.prospectId,
    })
    if (!prospect) {
      return NextResponse.json({ error: 'Associated prospect not found' }, { status: 404 })
    }

    try {
      switch (draft.channel) {
        case 'linkedin': {
          if (!prospect.linkedinUrl) {
            throw new Error('No LinkedIn URL on prospect')
          }
          await sendLinkedInDM({
            profileUrl: prospect.linkedinUrl,
            message: draft.body,
          })
          break
        }
        case 'email': {
          if (!prospect.email) {
            throw new Error('No email address on prospect')
          }
          await sendEmail(tenantCtx.userId, {
            to: prospect.email,
            subject: draft.subject ?? 'Hey',
            body: draft.body,
          })
          break
        }
        default:
          throw new Error(`Sending on channel "${draft.channel}" is not yet supported`)
      }

      await convex.mutation(api.prospects.updateDraftStatus, {
        draftId: draftId as Id<'outreachDrafts'>,
        status: 'sent',
        sentAt: Date.now(),
      })

      await convex.mutation(api.prospects.updateProspect, {
        prospectId: draft.prospectId,
        status: 'sent',
      })

      return NextResponse.json({ success: true, channel: draft.channel })
    } catch (sendError) {
      const errMsg = sendError instanceof Error ? sendError.message : 'Send failed'
      await convex.mutation(api.prospects.updateDraftStatus, {
        draftId: draftId as Id<'outreachDrafts'>,
        status: 'failed',
        sendError: errMsg,
      })
      return NextResponse.json({ error: errMsg, sent: false }, { status: 502 })
    }
  } catch (error) {
    console.error('[Draft Send] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
