import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function toCsv(rows: Array<Record<string, unknown>>): string {
  const headers = ['createdAt', 'decision', 'channel', 'phone', 'reasonCodes', 'policyVersion']
  const escape = (value: unknown) =>
    `"${String(value ?? '').replaceAll('"', '""')}"`
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.createdAt,
        row.decision,
        row.channel,
        row.phone,
        Array.isArray(row.reasonCodes) ? row.reasonCodes.join('|') : '',
        row.policyVersion,
      ]
        .map(escape)
        .join(',')
    ),
  ]
  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await getTenantContext()
    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const rows = await convex.query((api as any).compliance.listAuditEvents, {
      tenantId: dbUser.tenantId,
      limit: 250,
    })
    const format = req.nextUrl.searchParams.get('format')
    if (format === 'csv') {
      return new NextResponse(toCsv(rows), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="compliance-audit.csv"',
        },
      })
    }
    return NextResponse.json({ rows })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load audit events' },
      { status: 500 }
    )
  }
}
