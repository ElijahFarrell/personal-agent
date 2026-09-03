import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { runSmarterContactPoll } from '@/services/replyOs/adapters/smarterContact'
import type { Id } from '@convex/_generated/dataModel'

interface PollTenant {
  tenantId: Id<'tenants'>
  userId: Id<'users'>
}

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice(7)
  return Boolean(config.cron.secret) && token === config.cron.secret
}

function parsePollTenants(raw: string): PollTenant[] {
  if (!raw.trim()) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('SMARTER_CONTACT_POLL_TENANTS must be a JSON array')
  }
  const tenants: PollTenant[] = []
  for (const entry of parsed) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'tenantId' in entry &&
      'userId' in entry &&
      typeof entry.tenantId === 'string' &&
      typeof entry.userId === 'string'
    ) {
      tenants.push({
        tenantId: entry.tenantId as Id<'tenants'>,
        userId: entry.userId as Id<'users'>,
      })
    }
  }
  return tenants
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const tenants = parsePollTenants(config.smarterContact.pollTenants)
    const results: Array<{
      tenantId: string
      threadsSeen: number
      newMessages: number
      skipped?: boolean
      error?: string
    }> = []

    for (const entry of tenants) {
      try {
        const result = await runSmarterContactPoll(entry)
        results.push({
          tenantId: entry.tenantId,
          threadsSeen: result.threadsSeen,
          newMessages: result.newMessages,
          skipped: result.skipped,
        })
      } catch (error) {
        results.push({
          tenantId: entry.tenantId,
          threadsSeen: 0,
          newMessages: 0,
          error: error instanceof Error ? error.message : 'Poll failed',
        })
      }
    }

    return NextResponse.json({
      polled: results.length,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Poll cron failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
