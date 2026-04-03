/**
 * Centralized API route paths. Use these instead of hardcoded strings.
 */
export const API_ROUTES = {
  chat: '/api/chat',
  voiceTranscribe: '/api/voice/transcribe',
  voiceRetellWebCall: '/api/voice/retell/web-call',
  threadSummarize: '/api/thread/summarize',
  prospectsEnrich: '/api/prospects/enrich',
  prospectsDraftsCrmSync: '/api/prospects/drafts/crm-sync',
  prospectsDraftsAction: (action: string) => `/api/prospects/drafts/${action}`,
  contextIndex: '/api/context/index',
  adminSeed: '/api/admin/seed',
  skills: '/api/skills',
  skillsReindex: '/api/skills/reindex',
  skillsInstall: '/api/skills/install',
  skillsAuthor: '/api/skills/author',
  skillsBrowse: '/api/skills/browse',
  composioAuthorize: '/api/composio/authorize',
  composioDisconnect: '/api/composio/disconnect',
  composioStatus: '/api/composio/status',
  metaAdsInsights: '/api/metaAdsInsights',
  marketingSyncMetrics: '/api/marketing/sync-metrics',
  adsIntelligenceRun: '/api/ads-intelligence/run',
  telegramLink: '/api/telegram/link',
} as const
