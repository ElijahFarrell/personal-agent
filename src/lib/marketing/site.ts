/**
 * Public marketing site base URL (shiloh.sh).
 * Used in metadata, JSON-LD, and canonical URLs.
 */
export function getMarketingSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://shiloh.sh'
  )
}

/**
 * Product app base URL (aios.shiloh.sh) — sign-in, sign-up, dashboard.
 */
export function getAppPlatformUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_PLATFORM_URL?.replace(/\/$/, '') ??
    'https://aios.shiloh.sh'
  )
}

export function appSignUpUrl(): string {
  return `${getAppPlatformUrl()}/sign-up`
}

export function appSignInUrl(): string {
  return `${getAppPlatformUrl()}/sign-in`
}

export function appDashboardUrl(): string {
  return `${getAppPlatformUrl()}/dashboard`
}

/** Cal.com or other booking URL — override with NEXT_PUBLIC_BOOK_CALL_URL if needed. */
export function bookCallUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BOOK_CALL_URL?.replace(/\/$/, '') ??
    'https://cal.com/shilohai/15min'
  )
}
