/**
 * Server-only: full platform access for builder org, allowlisted users, or tenant flag.
 */
function parseIdList(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set()
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
}

export function isUserFullAccessAllowlisted(clerkUserId: string): boolean {
  return parseIdList(process.env.PLATFORM_FULL_ACCESS_USER_IDS).has(clerkUserId)
}

export function isOrgFullAccessAllowlisted(clerkOrgId: string): boolean {
  return parseIdList(process.env.PLATFORM_FULL_ACCESS_ORG_IDS).has(clerkOrgId)
}
