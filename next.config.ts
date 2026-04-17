import type { NextConfig } from 'next'

/**
 * Regex for `has: { type: 'host' }` (Next matches with /^value$/).
 * Maps clean URLs on the marketing domain to `/marketing/*` when no App Route exists.
 * `/` still resolves to `(app)/page.tsx` (redirect → `/marketing`), so this fixes `/features`, `/audit`, etc.
 */
function marketingHostHasPattern(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shiloh.sh'
  let hostname = 'shiloh.sh'
  try {
    hostname = new URL(raw).hostname.toLowerCase()
  } catch {
    /* keep default */
  }
  const escaped = hostname.replace(/\./g, '\\.')
  return `(www\\.)?${escaped}`
}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/features',
        destination: '/services',
        permanent: true,
      },
    ]
  },
  serverExternalPackages: [
    '@mastra/core',
    '@mastra/ai-sdk',
    '@mastra/memory',
    '@mastra/libsql',
    '@mastra/qdrant',
    '@mastra/mcp',
    'telegraf',
    'chokidar',
    'apify-client',
    'proxy-agent',
  ],
  async rewrites() {
    return {
      fallback: [
        {
          source: '/:path*',
          destination: '/marketing/:path*',
          has: [{ type: 'host', value: marketingHostHasPattern() }],
        },
      ],
    }
  },
}

export default nextConfig
