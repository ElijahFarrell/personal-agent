import { auth } from '@clerk/nextjs/server'
import type { TenantContext } from '@/types'

/** Default personal-use context (no Clerk required for Telegram personal mode). */
export const PERSONAL_CONTEXT: TenantContext = {
  tenantId: 'personal',
  userId: process.env.TELEGRAM_OWNER_ID ?? 'owner',
  tier: 'pro',
}

/**
 * Extract tenant context from an authenticated Clerk session.
 * Falls back to personal context if Clerk is not configured.
 */
export async function getTenantContext(): Promise<TenantContext> {
  try {
    const { userId, orgId } = await auth()

    if (!userId) return PERSONAL_CONTEXT

    return {
      tenantId: orgId ?? userId,
      userId,
      tier: 'pro',
    }
  } catch {
    return PERSONAL_CONTEXT
  }
}

/**
 * Build a tenant context for Telegram messages based on the sender's Telegram user ID.
 * Maps Telegram IDs to internal user IDs — in production, look this up in the DB.
 */
export function getTelegramContext(telegramUserId: string): TenantContext {
  const ownerId = process.env.TELEGRAM_OWNER_ID
  if (telegramUserId === ownerId) return PERSONAL_CONTEXT

  return {
    tenantId: `telegram-${telegramUserId}`,
    userId: telegramUserId,
    tier: 'free',
  }
}
