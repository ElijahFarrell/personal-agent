import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@mastra/core', '@mastra/memory', 'telegraf', 'chokidar'],
}

export default nextConfig
