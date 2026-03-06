/**
 * Centralized API route paths. Use these instead of hardcoded strings.
 */
export const API_ROUTES = {
  chat: '/api/chat',
  voiceTranscribe: '/api/voice/transcribe',
  threadSummarize: '/api/thread/summarize',
  prospectsEnrich: '/api/prospects/enrich',
  prospectsDraftsCrmSync: '/api/prospects/drafts/crm-sync',
  prospectsDraftsAction: (action: string) => `/api/prospects/drafts/${action}`,
  contextIndex: '/api/context/index',
  adminSeed: '/api/admin/seed',
  skillsReindex: '/api/skills/reindex',
  nangoSession: '/api/nango/session',
  nangoConfirm: '/api/nango/confirm',
  nangoDisconnect: '/api/nango/disconnect',
  telegramLink: '/api/telegram/link',
} as const
