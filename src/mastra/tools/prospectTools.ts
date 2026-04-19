/**
 * Prospect CRUD tools for the orchestrator — Convex-backed, tenant-scoped via signed-in user.
 */
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  PROSPECT_SOURCE,
  PROSPECT_STAGE,
  PROSPECT_STATUS,
} from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const statusSchema = z.enum([
  PROSPECT_STATUS.NEW,
  PROSPECT_STATUS.RESEARCHING,
  PROSPECT_STATUS.DRAFT_READY,
  PROSPECT_STATUS.APPROVED,
  PROSPECT_STATUS.SENT,
  PROSPECT_STATUS.REPLIED,
  PROSPECT_STATUS.ARCHIVED,
])

const stageSchema = z.enum([
  PROSPECT_STAGE.NEW,
  PROSPECT_STAGE.MESSAGED,
  PROSPECT_STAGE.FOLLOW_UP,
  PROSPECT_STAGE.MEETING_BOOKED,
  PROSPECT_STAGE.INTERESTED,
  PROSPECT_STAGE.DEAD,
  PROSPECT_STAGE.DEAL_OPEN,
])

async function requireDbUser(clerkUserId: string) {
  const dbUser = await convex.query(api.users.getUserByClerkUserId, {
    clerkUserId,
  })
  return dbUser
}

function matchesSearch(
  p: {
    name: string
    company?: string
    email?: string
    notes?: string
  },
  q: string
): boolean {
  const lower = q.toLowerCase()
  return (
    p.name.toLowerCase().includes(lower) ||
    (p.company?.toLowerCase().includes(lower) ?? false) ||
    (p.email?.toLowerCase().includes(lower) ?? false) ||
    (p.notes?.toLowerCase().includes(lower) ?? false)
  )
}

/**
 * Tools scoped to the current user (tenant derived from Convex user row).
 */
export function createProspectTools(clerkUserId: string) {
  return {
    /**
     * Router covering the three read-side prospect operations — list, search,
     * and get. Create/update stay on their own tools because mutations
     * deserve their own visible LLM surface.
     */
    prospectsQuery: createTool({
      id: 'prospects-query',
      description:
        'Prospect read router. Pass `action`: ' +
        '`list` (pipeline view with optional stage/status/owner filters), ' +
        '`search` (text search across name/company/email/notes — requires query), or ' +
        '`get` (load one prospect with research snapshot and drafts — requires prospectId). ' +
        'Use `list` for pipeline summaries and follow-up lists, `search` when the user names a person/company, ' +
        '`get` when you already have the prospect id and need full detail.',
      inputSchema: z
        .object({
          action: z
            .enum(['list', 'search', 'get'])
            .describe('list | search | get — pick one of the read operations.'),
          stage: stageSchema.optional().describe('Only for `list`.'),
          status: statusSchema.optional().describe('Only for `list`.'),
          ownerId: z
            .string()
            .optional()
            .describe('Convex user id to filter by. Only for `list`.'),
          limit: z
            .number()
            .int()
            .min(1)
            .max(200)
            .optional()
            .describe('list: default 50 (max 200). search: default 20 (max 50).'),
          query: z
            .string()
            .optional()
            .describe(
              'Required when action="search". Free text matched against name/company/email/notes.'
            ),
          prospectId: z
            .string()
            .optional()
            .describe('Required when action="get". Convex prospect document id.'),
        })
        .superRefine((val, ctx) => {
          if (val.action === 'search' && !val.query?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'action="search" requires query',
              path: ['query'],
            })
          }
          if (val.action === 'get' && !val.prospectId) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'action="get" requires prospectId',
              path: ['prospectId'],
            })
          }
        }),
      execute: async (input) => {
        const dbUser = await requireDbUser(clerkUserId)
        if (!dbUser) return 'User not found. Sign in to manage prospects.'

        if (input.action === 'list') {
          const limit = input.limit ?? 50
          let rows = await convex.query(api.prospects.getProspectsByTenantId, {
            tenantId: dbUser.tenantId,
          })
          if (input.status) rows = rows.filter((p) => p.status === input.status)
          if (input.stage)
            rows = rows.filter((p) => (p.stage ?? 'new') === input.stage)
          if (input.ownerId)
            rows = rows.filter((p) => String(p.ownerId) === input.ownerId)

          const sliced = rows.slice(0, limit)
          if (sliced.length === 0) return 'No prospects match the filters.'

          const lines = sliced.map(
            (p) =>
              `- **${p.name}** [id: ${p._id}] — stage: ${p.stage ?? 'n/a'}, status: ${p.status}, company: ${p.company ?? '—'}, updated: ${new Date(p.updatedAt).toISOString()}`
          )
          return `Found ${sliced.length} prospect(s) (showing up to ${limit}):\n\n${lines.join('\n')}`
        }

        if (input.action === 'search') {
          const limit = input.limit ?? 20
          const q = (input.query ?? '').trim()
          const all = await convex.query(api.prospects.getProspectsByTenantId, {
            tenantId: dbUser.tenantId,
          })
          const matched = all.filter((p) =>
            matchesSearch(
              {
                name: p.name,
                company: p.company,
                email: p.email,
                notes: p.notes,
              },
              q
            )
          )
          const sliced = matched.slice(0, limit)
          if (sliced.length === 0) return `No prospects matching "${q}".`
          const lines = sliced.map(
            (p) =>
              `- **${p.name}** [id: ${p._id}] — ${p.company ?? 'no company'} — ${p.stage ?? 'n/a'} / ${p.status}`
          )
          return `Matches for "${q}" (${sliced.length} of ${matched.length}):\n\n${lines.join('\n')}`
        }

        // action === 'get'
        const prospect = await convex.query(api.prospects.getProspect, {
          prospectId: input.prospectId as Id<'prospects'>,
        })
        if (!prospect || prospect.tenantId !== dbUser.tenantId) {
          return 'Prospect not found or access denied.'
        }

        const [snapshot, drafts] = await Promise.all([
          convex.query(api.prospects.getResearchSnapshot, {
            prospectId: input.prospectId as Id<'prospects'>,
          }),
          convex.query(api.prospects.getDraftsByProspect, {
            prospectId: input.prospectId as Id<'prospects'>,
          }),
        ])

        const header = JSON.stringify(
          {
            id: prospect._id,
            name: prospect.name,
            firstName: prospect.firstName,
            lastName: prospect.lastName,
            company: prospect.company,
            email: prospect.email,
            phone: prospect.phone,
            linkedinUrl: prospect.linkedinUrl,
            websiteUrl: prospect.websiteUrl,
            status: prospect.status,
            stage: prospect.stage,
            source: prospect.source,
            notes: prospect.notes,
            ownerId: prospect.ownerId,
            leadScore: prospect.leadScore,
            updatedAt: prospect.updatedAt,
          },
          null,
          2
        )

        const snapBlock = snapshot
          ? `\n\n**Research snapshot** (researchedAt: ${new Date(snapshot.researchedAt).toISOString()}):\n${JSON.stringify(snapshot, null, 2)}`
          : '\n\nNo research snapshot yet.'

        const draftsBlock =
          drafts.length > 0
            ? `\n\n**Outreach drafts** (${drafts.length}):\n${drafts
                .map(
                  (d) =>
                    `- [${d._id}] ${d.channel} — ${d.status}${d.subject ? ` — "${d.subject}"` : ''}`
                )
                .join('\n')}`
            : '\n\nNo outreach drafts.'

        return `## Prospect\n\`\`\`json\n${header}\`\`\`${snapBlock}${draftsBlock}`
      },
    }),

    updateProspect: createTool({
      id: 'update-prospect',
      description:
        'Update a prospect\'s stage, status, notes, owner, name, company, or custom fields.',
      inputSchema: z.object({
        prospectId: z.string(),
        name: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        linkedinUrl: z.string().optional(),
        websiteUrl: z.string().optional(),
        status: statusSchema.optional(),
        stage: stageSchema.optional(),
        notes: z.string().optional(),
        ownerId: z.string().optional().describe('Convex user id or empty to unassign'),
        customFields: z.record(z.unknown()).optional(),
        leadScore: z.number().min(0).max(100).optional(),
      }),
      execute: async (input) => {
        const dbUser = await requireDbUser(clerkUserId)
        if (!dbUser) return 'User not found.'

        const prospect = await convex.query(api.prospects.getProspect, {
          prospectId: input.prospectId as Id<'prospects'>,
        })
        if (!prospect || prospect.tenantId !== dbUser.tenantId) {
          return 'Prospect not found or access denied.'
        }

        const { prospectId, ownerId, ...rest } = input
        const patch: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) patch[k] = v
        }
        if (ownerId !== undefined && ownerId !== '') {
          patch.ownerId = ownerId as Id<'users'>
        }

        await convex.mutation(api.prospects.updateProspect, {
          prospectId: prospectId as Id<'prospects'>,
          ...patch,
        })
        return `Updated prospect ${prospectId}.`
      },
    }),

    createProspectRecord: createTool({
      id: 'create-prospect',
      description: 'Create a new prospect in the pipeline (manual entry).',
      inputSchema: z
        .object({
          name: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          company: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          linkedinUrl: z.string().optional(),
          websiteUrl: z.string().optional(),
          notes: z.string().optional(),
          stage: stageSchema.optional(),
        })
        .refine(
          (v) =>
            Boolean(
              (v.name && v.name.trim()) ||
                v.firstName?.trim() ||
                v.lastName?.trim()
            ),
          { message: 'Provide name or at least first or last name.' }
        ),
      execute: async (input) => {
        const dbUser = await requireDbUser(clerkUserId)
        if (!dbUser) return 'User not found.'

        const id = await convex.mutation(api.prospects.createProspect, {
          tenantId: dbUser.tenantId,
          ownerId: dbUser._id,
          source: PROSPECT_SOURCE.MANUAL,
          ...input,
        })
        return `Created prospect with id: ${id}`
      },
    }),

  }
}
