import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

const APP_PATH_PREFIXES = [
  '/dashboard',
  '/sign-in',
  '/sign-up',
  '/api',
] as const

function isAppPath(pathname: string): boolean {
  return APP_PATH_PREFIXES.some((p) => pathname.startsWith(p))
}

/** Prefer CDN-forwarded host; normalize port and case (production may differ from bare `Host`). */
function getRequestHostname(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-host')
  const raw =
    forwarded?.split(',')[0]?.trim() ?? request.headers.get('host') ?? ''
  return raw.split(':')[0].toLowerCase()
}

function isMarketingHostname(hostname: string): boolean {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) {
    try {
      const h = new URL(fromEnv).hostname.toLowerCase()
      if (hostname === h) return true
      if (h.startsWith('www.') && hostname === h.slice(4)) return true
      if (!h.startsWith('www.') && hostname === `www.${h}`) return true
    } catch {
      /* ignore invalid URL */
    }
  }
  return hostname === 'example.com' || hostname === 'www.example.com'
}

function marketingRewrite(request: NextRequest): NextResponse | null {
  const host = getRequestHostname(request)
  const pathname = request.nextUrl.pathname

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/favicon.ico'
  ) {
    return null
  }

  const appOrigin =
    process.env.NEXT_PUBLIC_APP_PLATFORM_URL ?? 'https://aios.example.com'

  const isMarketingHost = isMarketingHostname(host)
  const isLocalhost = host === 'localhost' || host === '127.0.0.1'

  // Marketing domain: send app routes to the product subdomain
  if (isMarketingHost && pathname.startsWith('/dashboard')) {
    const url = new URL(pathname + request.nextUrl.search, appOrigin)
    return NextResponse.redirect(url)
  }
  if (
    isMarketingHost &&
    (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))
  ) {
    const url = new URL(pathname + request.nextUrl.search, appOrigin)
    return NextResponse.redirect(url)
  }

  // example.com — map public URLs to /marketing/* routes
  if (isMarketingHost && !pathname.startsWith('/marketing')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/' ? '/marketing' : `/marketing${pathname}`
    return NextResponse.rewrite(url)
  }

  // Local dev: same mapping (so links stay /pricing not /marketing/pricing)
  if (
    isLocalhost &&
    !pathname.startsWith('/marketing') &&
    !isAppPath(pathname)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/' ? '/marketing' : `/marketing${pathname}`
    return NextResponse.rewrite(url)
  }

  return null
}

const handler = clerkMiddleware(async (auth, request) => {
  const rewritten = marketingRewrite(request)
  if (rewritten) {
    return rewritten
  }

  if (isProtectedRoute(request)) {
    const { userId, has } = await auth()

    if (!userId) {
      await auth.protect()
      return
    }

    const hasOrgAccess =
      has({ role: 'org:admin' }) || has({ role: 'org:member' })
    if (!hasOrgAccess) {
      const deniedUrl = new URL('/access-denied', request.url)
      return NextResponse.redirect(deniedUrl)
    }
  }
})

/** Next.js 16+ recognizes `src/proxy.ts`; named `proxy` matches the documented convention. */
export const proxy = handler
export default handler

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
