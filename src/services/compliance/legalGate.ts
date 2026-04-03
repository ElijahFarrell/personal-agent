import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { LEGAL_DOC_VERSION } from '@/constants/compliancePolicies'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function ensureLegalAcceptance(args: {
  tenantId: Id<'tenants'>
  userId: Id<'users'>
}) {
  const status = await convex.query((api as any).compliance.getLegalAcceptanceStatus, {
    tenantId: args.tenantId,
    userId: args.userId,
    requiredVersion: LEGAL_DOC_VERSION,
  })
  if (!status.accepted) {
    throw new Error(`Legal acceptance required: ${status.missing.join(', ')}`)
  }
}
