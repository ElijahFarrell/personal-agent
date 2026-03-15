import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { assertSuperAdmin } from '@/middleware/adminGuard'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId } = await auth()
    assertSuperAdmin(userId)

    const { orgId } = await params
    const members = await convex.query(api.users.getUsersByTenantId, {
      tenantId: orgId as Id<'tenants'>,
    })

    return NextResponse.json(members)
  } catch (err) {
    if (err instanceof Response) throw err
    console.error('[Admin Members GET]', err)
    return NextResponse.json(
      { error: 'Failed to list members' },
      { status: 500 }
    )
  }
}
