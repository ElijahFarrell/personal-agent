/**
 * Super admin guard for admin-only API routes and client-side checks.
 * Uses SUPER_ADMIN_USER_ID (server) and NEXT_PUBLIC_SUPER_ADMIN_USER_ID (client).
 * Set both to your Clerk userId to enable admin access.
 */

function getServerAdminId(): string {
  return process.env.SUPER_ADMIN_USER_ID ?? ''
}

function getClientAdminId(): string {
  return process.env.NEXT_PUBLIC_SUPER_ADMIN_USER_ID ?? ''
}

/**
 * Throws 403 if the given userId is not the super admin.
 * Call this at the start of every admin API route after resolving auth.
 */
export function assertSuperAdmin(userId: string | null): asserts userId is string {
  const adminId = getServerAdminId()
  if (!adminId) {
    throw new Response(
      JSON.stringify({ error: 'Admin access not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!userId || userId !== adminId) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Returns true if the given userId is the super admin.
 * Use for client-side checks (e.g. showing Admin nav link).
 * Reads NEXT_PUBLIC_SUPER_ADMIN_USER_ID.
 */
export function isSuperAdmin(userId: string | null): boolean {
  const adminId = typeof window !== 'undefined' ? getClientAdminId() : getServerAdminId()
  return !!adminId && !!userId && userId === adminId
}
