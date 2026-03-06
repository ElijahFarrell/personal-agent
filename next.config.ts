import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@mastra/core', '@mastra/memory', 'telegraf', 'chokidar', 'apify-client', 'proxy-agent'],
}

export default nextConfig
