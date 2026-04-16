/**
 * Human-readable labels and timing hints for orchestrator / subagent tools in chat UI.
 */
export const CHAT_TOOL_UI: Record<
  string,
  { title: string; hint?: string; slow?: boolean }
> = {
  'sdr-agent': {
    title: 'Lead & outreach (SDR)',
    hint: 'Apollo search and Exa websets often take 1–6 minutes.',
    slow: true,
  },
  'research-agent': {
    title: 'Research',
    hint: 'Web research may take 30s–3 minutes.',
    slow: true,
  },
  'web-search': { title: 'Web search' },
  'deep-search': {
    title: 'Deep search (Exa)',
    hint: 'Deep search can take 15–60s.',
    slow: true,
  },
  'email-agent': { title: 'Email' },
  'calendar-agent': { title: 'Calendar' },
  'linkedin-agent': { title: 'LinkedIn' },
  'content-agent': { title: 'Content' },
  'instagram-agent': { title: 'Instagram' },
  'browser-agent': { title: 'Browser' },
  'messaging-agent': { title: 'Messaging' },
  'docs-agent': { title: 'Docs' },
  'crm-agent': { title: 'CRM' },
  'project-agent': { title: 'Projects' },
  'real-estate-agent': { title: 'Real estate' },
  'finance-agent': { title: 'Finance' },
  'marketing-agent': { title: 'Marketing' },
  'lead-agent': {
    title: 'Lead & outreach',
    hint: 'Apollo / Exa calls can take several minutes.',
    slow: true,
  },
  mem0Recall: { title: 'Memory recall' },
  mem0Memorize: { title: 'Save to memory' },
  'create-schedule': { title: 'Create schedule' },
  'list-schedules': { title: 'List schedules' },
  'generate-chart': { title: 'Chart' },
  'run-exa-webset-search': {
    title: 'Exa company search',
    hint: 'Exa websets can take 5–10 minutes for large searches.',
    slow: true,
  },
  'add-exa-results-to-prospects': { title: 'Add Exa results to prospects' },
  'fetch-exa-webset-by-id': { title: 'Fetch Exa webset' },
  'add-exa-webset-to-prospects': { title: 'Add webset to prospects' },
  'build-workflow': { title: 'Build workflow' },
  'run-workflow': {
    title: 'Run workflow',
    hint: 'Workflow runs may take a minute or more.',
    slow: true,
  },
  'list-prospects': { title: 'List prospects' },
  'get-prospect': { title: 'Load prospect' },
  'search-prospects': { title: 'Search prospects' },
  'create-prospect': { title: 'Create prospect' },
  'update-prospect': { title: 'Update prospect' },
}

/** Milestone line when a tool starts (stream chunk tool-input-start). */
export function milestoneLineForTool(toolName: string): string | undefined {
  const key = toolName.replace(/^tool-/, '')
  const row = CHAT_TOOL_UI[key]
  if (row?.slow) {
    return `${row.title}: ${row.hint ?? 'This step may take a few minutes.'}`
  }
  if (row) {
    return `Running ${row.title}…`
  }
  return `Running ${key.replace(/-/g, ' ')}…`
}

export function chatToolTitle(toolName: string): string {
  const key = toolName.replace(/^tool-/, '')
  return CHAT_TOOL_UI[key]?.title ?? toolName.replace(/-/g, ' ')
}

export function chatToolHint(toolName: string): string | undefined {
  const key = toolName.replace(/^tool-/, '')
  return CHAT_TOOL_UI[key]?.hint
}
