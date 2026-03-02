'use client'

import { useEffect, useRef } from 'react'
import { useUser, useOrganization } from '@clerk/nextjs'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'

/**
 * Invisible component. On first mount, ensures a Convex tenant + user record
 * exists for the signed-in Clerk user. Safe to call on every dashboard load —
 * the mutation is idempotent and returns early if the user already exists.
 *
 * When the user belongs to a Clerk Organization, the org ID is passed so
 * multiple users in the same org share a single tenant.
 */
export function OnboardUser() {
  const { user, isLoaded: userLoaded } = useUser()
  const { organization, isLoaded: orgLoaded } = useOrganization()
  const ensureUser = useMutation(api.users.ensureUser)
  const hasRun = useRef(false)

  useEffect(() => {
    if (!userLoaded || !orgLoaded || !user || hasRun.current) return
    hasRun.current = true

    ensureUser({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? '',
      name: user.fullName ?? user.firstName ?? user.id,
      orgId: organization?.id,
    }).catch((err) => console.error('[OnboardUser] Failed to provision user:', err))
  }, [userLoaded, orgLoaded, user, organization, ensureUser])

  return null
}
