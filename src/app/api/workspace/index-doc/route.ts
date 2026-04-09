import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'
import {
  indexWorkspaceDocument,
  removeWorkspaceDocumentFromIndex,
} from '@/services/workspaceKnowledgeService'
import type { ResourceScope } from '@/types'
import { qdrantTenantKeyFromConvexTenantId } from '@/lib/workspaceTenantKey'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Embed a workspace document into Qdrant (call after text is ready).
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId: tenantKey, userId } = await getTenantContext()
    const body = await req.json()
    const docId = body.docId as Id<'workspaceDocuments'> | undefined
    if (!docId) {
      return NextResponse.json({ error: 'docId is required' }, { status: 400 })
    }

    const doc = await convex.query(api.workspaceDocuments.getWorkspaceDocument, { docId })
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const qKey = await qdrantTenantKeyFromConvexTenantId(doc.tenantId)
    if (qKey !== tenantKey) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const scope = doc.scope as ResourceScope
    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (scope === 'user' && doc.userId !== dbUser?._id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const text =
      doc.extractedText?.trim() ||
      doc.transcript?.trim() ||
      ''
    if (!text) {
      return NextResponse.json(
        { error: 'Document has no extracted text to index' },
        { status: 400 }
      )
    }

    if (doc.chunkCount && doc.chunkCount > 0) {
      await removeWorkspaceDocumentFromIndex(tenantKey, docId, doc.chunkCount)
    }

    const chunks = await indexWorkspaceDocument({
      id: docId,
      tenantKey,
      scope,
      userId: scope === 'user' ? String(doc.userId) : undefined,
      title: doc.title,
      body: text,
      category: doc.category ?? doc.type,
    })

    await convex.mutation(api.workspaceDocuments.updateWorkspaceDocument, {
      tenantId: doc.tenantId,
      docId,
      chunkCount: chunks,
      processingError: null,
    })

    return NextResponse.json({ ok: true, chunkCount: chunks })
  } catch (error) {
    console.error('[workspace/index-doc]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
