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
  nango: {
    secretKey: optionalEnv('NANGO_SECRET_KEY'),
    webhookSecret: optionalEnv('NANGO_WEBHOOK_SECRET'),
    publicKey: optionalEnv('NEXT_PUBLIC_NANGO_PUBLIC_KEY'),
  },
  telegram: {
    botToken: optionalEnv('TELEGRAM_BOT_TOKEN'),
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
} as const
