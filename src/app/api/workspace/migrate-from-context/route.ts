import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'
import { indexWorkspaceDocument } from '@/services/workspaceKnowledgeService'
import { qdrantTenantKeyFromConvexTenantId } from '@/lib/workspaceTenantKey'
import type { ResourceScope } from '@/types'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Copy legacy context docs into workspace_documents and index each into Qdrant.
 */
export async function POST() {
  try {
    const { userId: clerkUserId } = await getTenantContext()
    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { importedIds } = await convex.mutation(
      api.workspaceDocuments.migrateContextDocsToWorkspace,
      { tenantId: dbUser.tenantId }
    )

    const tenantKey = await qdrantTenantKeyFromConvexTenantId(dbUser.tenantId)
    let indexed = 0

    for (const docId of importedIds) {
      const doc = await convex.query(api.workspaceDocuments.getWorkspaceDocument, { docId })
      if (!doc?.extractedText?.trim()) continue
      const scope = doc.scope as ResourceScope
      const chunks = await indexWorkspaceDocument({
        id: docId,
        tenantKey,
        scope,
        userId: scope === 'user' ? String(doc.userId) : undefined,
        title: doc.title,
        body: doc.extractedText,
        category: doc.category ?? 'migrated-context',
      })
      await convex.mutation(api.workspaceDocuments.updateWorkspaceDocument, {
        tenantId: doc.tenantId,
        docId,
        chunkCount: chunks,
      })
      indexed += 1
    }

    return NextResponse.json({ ok: true, imported: importedIds.length, indexed })
  } catch (error) {
    console.error('[workspace/migrate-from-context]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
