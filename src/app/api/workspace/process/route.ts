import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'
import { extractWorkspaceContent } from '@/services/workspaceProcessService'
import {
  indexWorkspaceDocument,
  removeWorkspaceDocumentFromIndex,
} from '@/services/workspaceKnowledgeService'
import type { ResourceScope } from '@/types'
import { WORKSPACE_DOC_STATUS } from '@convex/constants'
import { qdrantTenantKeyFromConvexTenantId } from '@/lib/workspaceTenantKey'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Extract text from PDF / YouTube / URLs and index into Qdrant.
 */
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
      clerkUserId: clerkUserId,
    })
    const scope = doc.scope as ResourceScope
    if (scope === 'user' && doc.userId !== dbUser?._id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tid = doc.tenantId

    await convex.mutation(api.workspaceDocuments.updateWorkspaceDocument, {
      tenantId: tid,
      docId,
      status: WORKSPACE_DOC_STATUS.PROCESSING,
      processingError: null,
    })

    let title = doc.title
    let extractedText = doc.extractedText?.trim() ?? ''
    let transcript: string | undefined

    try {
      if (!extractedText) {
        const fileUrl = doc.storageId
          ? await convex.query(api.workspaceDocuments.getSignedFileUrlForDocument, {
              tenantId: tid,
              docId,
            })
          : null

        const result = await extractWorkspaceContent({
          type: doc.type,
          title: doc.title,
          sourceUrl: doc.sourceUrl,
          fileUrl,
          mimeType: doc.mimeType,
        })
        extractedText = result.extractedText
        transcript = result.transcript
        if (result.title) title = result.title
      }

      await convex.mutation(api.workspaceDocuments.updateWorkspaceDocument, {
        tenantId: tid,
        docId,
        title,
        extractedText,
        transcript,
        status: WORKSPACE_DOC_STATUS.READY,
        processingError: null,
      })

      if (doc.chunkCount && doc.chunkCount > 0) {
        await removeWorkspaceDocumentFromIndex(tenantKey, docId, doc.chunkCount)
      }

      const chunks = await indexWorkspaceDocument({
        id: docId,
        tenantKey,
        scope,
        userId: scope === 'user' ? String(doc.userId) : undefined,
        title,
        body: extractedText,
        category: doc.category ?? doc.type,
      })

      await convex.mutation(api.workspaceDocuments.updateWorkspaceDocument, {
        tenantId: tid,
        docId,
        chunkCount: chunks,
      })

      return NextResponse.json({ ok: true, chunkCount: chunks })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed'
      await convex.mutation(api.workspaceDocuments.updateWorkspaceDocument, {
        tenantId: tid,
        docId,
        status: WORKSPACE_DOC_STATUS.ERROR,
        processingError: message,
      })
      return NextResponse.json({ error: message }, { status: 422 })
    }
  } catch (error) {
    console.error('[workspace/process]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
