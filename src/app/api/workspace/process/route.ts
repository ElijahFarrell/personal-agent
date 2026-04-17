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
import type { WorkspaceChunkSeed } from '@/services/workspaceKnowledgeService'
import type { ResourceScope } from '@/types'
import { WORKSPACE_DOC_STATUS } from '@convex/constants'
import { qdrantTenantKeyFromConvexTenantId } from '@/lib/workspaceTenantKey'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const GENERIC_PROCESSING_ERROR =
  'We could not process this document right now. Please try again in a moment.'

/**
 * Map raw extraction errors to a short, user-friendly message we are willing to show in the UI.
 * The full error is still logged server-side for debugging.
 */
function toUserFacingProcessingError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const lower = raw.toLowerCase()

  if (
    lower.includes('cannot find module') ||
    lower.includes('module_not_found') ||
    lower.includes('require stack')
  ) {
    return GENERIC_PROCESSING_ERROR
  }
  if (lower.includes('apify api is not configured')) {
    return 'YouTube transcription is not configured. Please contact support.'
  }
  if (
    lower.includes('no transcript') ||
    lower.includes('transcript text was empty') ||
    lower.includes('no transcript data returned')
  ) {
    return 'No transcript is available for this video.'
  }
  if (lower.includes('tavily_api_key')) {
    return 'Web extraction is not configured. Please contact support.'
  }
  if (lower.includes('failed to download pdf') || lower.includes('failed to download file')) {
    return 'Could not download the file. Please re-upload and try again.'
  }
  if (lower.includes('no text extracted from pdf')) {
    return 'We could not extract any text from this PDF.'
  }
  if (lower.includes('unsupported document type')) {
    return 'This document type is not supported yet.'
  }

  if (!raw.trim() || raw.length > 200 || /\n|\bat\s.+:\d+:\d+/.test(raw)) {
    return GENERIC_PROCESSING_ERROR
  }
  return raw
}

async function processDocument(
  docId: Id<'workspaceDocuments'>,
  tid: Id<'tenants'>,
  tenantKey: string,
  scope: ResourceScope,
  doc: {
    title: string
    type: string
    sourceUrl?: string
    storageId?: Id<'_storage'>
    mimeType?: string
    extractedText?: string
    chunkCount?: number
    category?: string
    userId: Id<'users'>
  }
) {
  try {
    // #region agent log
    console.log('[DBG:a3b5eb] processDocument START', JSON.stringify({docId,type:doc.type,hasExtractedText:!!doc.extractedText,hasStorageId:!!doc.storageId}))
    // #endregion
    await convex.mutation(api.workspaceDocuments.updateWorkspaceDocument, {
      tenantId: tid,
      docId,
      status: WORKSPACE_DOC_STATUS.PROCESSING,
      processingError: null,
    })

    let title = doc.title
    let extractedText = doc.extractedText?.trim() ?? ''
    let transcript: string | undefined
    let segments: WorkspaceChunkSeed[] | undefined = doc.extractedText?.trim()
      ? [{ content: doc.extractedText.trim(), reference: doc.sourceUrl ?? doc.title }]
      : undefined
    let extractionMetadata: Record<string, unknown> | undefined

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
      segments = result.segments
      extractionMetadata = result.metadata
    }

    // #region agent log
    console.log('[DBG:a3b5eb] extraction done', JSON.stringify({extractedTextLen:extractedText.length,segmentCount:segments?.length??0,hasTranscript:!!transcript}))
    // #endregion

    // Persist extracted content but stay in PROCESSING until Qdrant upsert succeeds.
    await convex.mutation(api.workspaceDocuments.updateWorkspaceDocument, {
      tenantId: tid,
      docId,
      title,
      extractedText,
      transcript,
      processingError: null,
      ...(extractionMetadata ? { metadata: extractionMetadata } : {}),
    })

    if (doc.chunkCount && doc.chunkCount > 0) {
      await removeWorkspaceDocumentFromIndex(tenantKey, docId, doc.chunkCount)
    }

    // #region agent log
    console.log('[DBG:a3b5eb] about to call indexWorkspaceDocument')
    // #endregion
    const chunks = await indexWorkspaceDocument({
      id: docId,
      tenantKey,
      scope,
      userId: scope === 'user' ? String(doc.userId) : undefined,
      title,
      body: extractedText,
      category: doc.category ?? doc.type,
      sourceUrl: doc.sourceUrl,
      segments,
    })

    // Only mark READY after Qdrant upsert succeeds.
    await convex.mutation(api.workspaceDocuments.updateWorkspaceDocument, {
      tenantId: tid,
      docId,
      status: WORKSPACE_DOC_STATUS.READY,
      chunkCount: chunks,
    })
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : 'Processing failed'
    const userMessage = toUserFacingProcessingError(err)
    // #region agent log
    console.log('[DBG:a3b5eb] processDocument CATCH', JSON.stringify({rawMessage, userMessage, errName:(err as Error)?.constructor?.name, stack:(err as Error)?.stack?.slice(0,500)}))
    // #endregion
    console.error(`[workspace/process] docId=${docId}`, err)
    try {
      await convex.mutation(api.workspaceDocuments.updateWorkspaceDocument, {
        tenantId: tid,
        docId,
        status: WORKSPACE_DOC_STATUS.ERROR,
        processingError: userMessage,
      })
    } catch (updateErr) {
      console.error('[workspace/process] failed to write error status', updateErr)
    }
  }
}

/**
 * Accept a workspace doc for async extraction + indexing.
 * Returns 202 immediately; status updates flow through Convex reactive queries.
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
      clerkUserId,
    })
    const scope = doc.scope as ResourceScope
    if (scope === 'user' && doc.userId !== dbUser?._id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fire-and-forget: extraction + indexing runs in the background.
    // Status updates are written to Convex so the client picks them up reactively.
    void processDocument(docId, doc.tenantId, tenantKey, scope, {
      title: doc.title,
      type: doc.type,
      sourceUrl: doc.sourceUrl,
      storageId: doc.storageId ?? undefined,
      mimeType: doc.mimeType,
      extractedText: doc.extractedText,
      chunkCount: doc.chunkCount,
      category: doc.category,
      userId: doc.userId,
    })

    return NextResponse.json({ ok: true, status: 'processing' }, { status: 202 })
  } catch (error) {
    console.error('[workspace/process]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
