function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

export const config = {
  gateway: {
    apiKey: optionalEnv('AI_GATEWAY_API_KEY'),
  },
  convex: {
    url: optionalEnv('NEXT_PUBLIC_CONVEX_URL'),
  },
  clerk: {
    publishableKey: optionalEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
    secretKey: optionalEnv('CLERK_SECRET_KEY'),
  },
  mem0: {
    apiKey: optionalEnv('MEM0_API_KEY'),
  },
  telegram: {
    botToken: optionalEnv('TELEGRAM_BOT_TOKEN'),
    botUsername: optionalEnv('TELEGRAM_BOT_USERNAME'),
    ownerId: optionalEnv('TELEGRAM_OWNER_ID'),
  },
  qdrant: {
    url: optionalEnv('QDRANT_URL', 'http://localhost:6333'),
    apiKey: optionalEnv('QDRANT_API_KEY'),
  },
  search: {
    tavilyApiKey: optionalEnv('TAVILY_API_KEY'),
    exaApiKey: optionalEnv('EXA_API_KEY'),
  },
  linkedin: {
    apiKey: optionalEnv('LINKEDAPI_KEY'),
  },
  apify: {
    apiToken: optionalEnv('APIFY_API_TOKEN'),
  },
  hunter: {
    apiKey: optionalEnv('HUNTER_API_KEY'),
  },
  meta: {
    appSecret: optionalEnv('META_APP_SECRET'),
    verifyToken: optionalEnv('META_VERIFY_TOKEN'),
    igAccessToken: optionalEnv('IG_PAGE_ACCESS_TOKEN'),
  },
  inngest: {
    eventKey: optionalEnv('INNGEST_EVENT_KEY'),
    signingKey: optionalEnv('INNGEST_SIGNING_KEY'),
  },
  cron: {
    secret: optionalEnv('CRON_SECRET'),
  },
  openai: {
    apiKey: optionalEnv('OPENAI_API_KEY'),
  },
  app: {
    url: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    isDev: process.env.NODE_ENV === 'development',
  },
  composio: {
    apiKey: optionalEnv('COMPOSIO_API_KEY'),
  },
  replicate: {
    apiToken: optionalEnv('REPLICATE_API_TOKEN'),
  },
  admin: {
    /** Clerk userId of the super admin (server). Only this user can access /api/admin/* */
    superAdminUserId: optionalEnv('SUPER_ADMIN_USER_ID'),
    /** Same value, for client-side checks (e.g. Admin nav link). Set both. */
    superAdminUserIdPublic: optionalEnv('NEXT_PUBLIC_SUPER_ADMIN_USER_ID'),
  },
} as const
