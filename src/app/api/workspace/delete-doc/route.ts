import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'
import { removeWorkspaceDocumentFromIndex } from '@/services/workspaceKnowledgeService'
import { qdrantTenantKeyFromConvexTenantId } from '@/lib/workspaceTenantKey'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { tenantId: tenantKey, userId: clerkUserId } = await getTenantContext()
    const body = await req.json()
    const docId = body.docId as Id<'workspaceDocuments'> | undefined
    if (!docId) {
      return NextResponse.json({ error: 'docId is required' }, { status: 400 })
    }

    const doc = await convex.query(api.workspaceDocuments.getWorkspaceDocument, { docId })
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const docTenantKey = await qdrantTenantKeyFromConvexTenantId(doc.tenantId)
    if (docTenantKey !== tenantKey) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId,
    })
    if (doc.scope === 'user' && doc.userId !== dbUser?._id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (doc.chunkCount && doc.chunkCount > 0) {
      await removeWorkspaceDocumentFromIndex(tenantKey, docId, doc.chunkCount)
    }

    await convex.mutation(api.workspaceDocuments.deleteWorkspaceDocument, {
      tenantId: doc.tenantId,
      docId,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[workspace/delete-doc]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
