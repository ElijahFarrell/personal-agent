import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  SCOPE,
  WORKSPACE_DOC_TYPE,
  WORKSPACE_DOC_STATUS,
} from '@convex/constants'
import {
  retrieveWorkspaceKnowledge,
  buildWorkspaceContextBlock,
  indexWorkspaceDocument,
} from '@/services/workspaceKnowledgeService'
import { qdrantTenantKeyFromConvexTenantId } from '@/lib/workspaceTenantKey'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const searchSchema = z.object({
  query: z.string().describe('Search query for the workspace knowledge base'),
})

const docIdSchema = z.object({
  docId: z.string().describe('Workspace document id'),
})

const listSchema = z.object({
  scope: z.enum(['org', 'user', 'all']).optional().describe('Filter by scope (default all visible)'),
})

const uploadSchema = z.object({
  title: z.string(),
  content: z.string(),
  scope: z.enum(['org', 'user']),
})

/**
 * Workspace tools. `clerkUserId` is the Clerk user id (same as other agent tools).
 */
export function createWorkspaceTools(clerkUserId: string, _tenantConvexId: string) {
  async function resolveDbUser() {
    return await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId,
    })
  }

  return {
    search_workspace: createTool({
      id: 'search-workspace',
      description:
        'Search the workspace knowledge base (uploaded files, PDFs, YouTube transcripts, saved links). ' +
        'Use for questions about stored documents and business reference material.',
      inputSchema: searchSchema,
      execute: async ({ query }) => {
        const dbUser = await resolveDbUser()
        if (!dbUser) return 'User not found.'
        const tenantKey = await qdrantTenantKeyFromConvexTenantId(dbUser.tenantId)
        const results = await retrieveWorkspaceKnowledge(
          query,
          tenantKey,
          String(dbUser._id)
        ).catch(() => [])
        if (results.length === 0) return 'No matching workspace documents found.'
        return buildWorkspaceContextBlock(results)
      },
    }),

    get_workspace_document: createTool({
      id: 'get-workspace-document',
      description: 'Load full text of a workspace document by id.',
      inputSchema: docIdSchema,
      execute: async ({ docId }) => {
        const dbUser = await resolveDbUser()
        if (!dbUser) return 'User not found.'
        const doc = await convex.query(api.workspaceDocuments.getWorkspaceDocument, {
          docId: docId as Id<'workspaceDocuments'>,
        })
        if (!doc || doc.tenantId !== dbUser.tenantId) {
          return 'Document not found.'
        }
        if (doc.scope === SCOPE.USER && doc.userId !== dbUser._id) {
          return 'Document not found.'
        }
        const body =
          doc.extractedText?.trim() ||
          doc.transcript?.trim() ||
          doc.summary?.trim() ||
          ''
        return `Title: ${doc.title}\nType: ${doc.type}\nStatus: ${doc.status}\n\n${body || '(no extracted text yet)'}`
      },
    }),

    list_workspace_documents: createTool({
      id: 'list-workspace-documents',
      description: 'List workspace documents the user can access (titles and ids).',
      inputSchema: listSchema,
      execute: async ({ scope }) => {
        const dbUser = await resolveDbUser()
        if (!dbUser) return 'User not found.'
        const all = await convex.query(api.workspaceDocuments.getAllWorkspaceDocumentsForChat, {
          tenantId: dbUser.tenantId,
          userId: dbUser._id,
        })
        const filtered =
          scope === 'org'
            ? all.filter((d) => d.scope === SCOPE.ORG)
            : scope === 'user'
              ? all.filter((d) => d.scope === SCOPE.USER)
              : all
        if (filtered.length === 0) return 'No workspace documents.'
        return filtered
          .map(
            (d) =>
              `- ${d.title} [${d._id}] type=${d.type} status=${d.status} scope=${d.scope}`
          )
          .join('\n')
      },
    }),

    upload_workspace_note: createTool({
      id: 'upload-workspace-note',
      description:
        'Add a short text note to the workspace knowledge base (org or user scope). ' +
        'The note will be indexed for retrieval.',
      inputSchema: uploadSchema,
      execute: async ({ title, content, scope }) => {
        const dbUser = await resolveDbUser()
        if (!dbUser) return 'User not found.'
        const id = await convex.mutation(api.workspaceDocuments.createWorkspaceDocument, {
          tenantId: dbUser.tenantId,
          userId: dbUser._id,
          scope,
          title,
          type: WORKSPACE_DOC_TYPE.NOTE,
          extractedText: content,
          status: WORKSPACE_DOC_STATUS.READY,
        })
        const tenantKey = await qdrantTenantKeyFromConvexTenantId(dbUser.tenantId)
        const chunks = await indexWorkspaceDocument({
          id,
          tenantKey,
          scope,
          userId: scope === 'user' ? String(dbUser._id) : undefined,
          title,
          body: content,
          category: 'note',
        })
        await convex.mutation(api.workspaceDocuments.updateWorkspaceDocument, {
          tenantId: dbUser.tenantId,
          docId: id,
          chunkCount: chunks,
        })
        return `Saved workspace note "${title}" (id: ${id}). Indexed in ${chunks} chunk(s).`
      },
    }),
  }
}
