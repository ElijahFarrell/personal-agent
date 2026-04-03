import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'
import { LEGAL_DOC_VERSION } from '@/constants/compliancePolicies'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getTenantContext()
    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const body = (await req.json()) as {
      acceptedDocs?: Array<'terms' | 'privacy' | 'compliance_agreement'>
    }
    const acceptedDocs = body.acceptedDocs ?? []
    if (acceptedDocs.length === 0) {
      return NextResponse.json({ error: 'acceptedDocs is required' }, { status: 400 })
    }

    await convex.mutation((api as any).compliance.recordLegalAcceptance, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      version: LEGAL_DOC_VERSION,
      acceptedDocs,
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save legal acceptance' },
      { status: 500 }
    )
  }
}
