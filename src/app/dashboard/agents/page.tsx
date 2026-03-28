'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import {
  BrainCircuit,
  Mail,
  Search,
  Calendar,
  Linkedin,
  PenLine,
  Camera,
  Globe,
  X,
  ChevronRight,
  Wrench,
  Cpu,
  BarChart2,
  Kanban,
  MessageSquare,
  FileText,
  Home,
  CreditCard,
  Megaphone,
  LineChart,
  Lock,
  Radar,
  Target,
  Rocket,
} from 'lucide-react'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import { isAgentAllowed } from '@/constants/featureGating'
import { cn } from '@/lib/utils'

// ─── Agent Catalog ────────────────────────────────────────────────────────────

interface AgentDef {
  id: string
  name: string
  role: string
  description: string
  model: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  tools: Array<{ id: string; description: string }>
  isOrchestrator?: boolean
}

const AGENTS: AgentDef[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    role: 'Central Intelligence',
    description:
      'The lead agent for all requests. Understands your intent, delegates tasks to the right specialist agents, calls multiple agents in parallel when needed, and synthesizes their results into a single response.',
    model: 'Claude Sonnet',
    icon: BrainCircuit,
    iconBg: 'bg-brand-600/10',
    iconColor: 'text-brand-400',
    isOrchestrator: true,
    tools: [
      { id: 'email-agent', description: 'Delegate to the Email Agent' },
      { id: 'research-agent', description: 'Delegate to the Research Agent' },
      { id: 'calendar-agent', description: 'Delegate to the Calendar Agent' },
      { id: 'linkedin-agent', description: 'Delegate to the LinkedIn Agent' },
      { id: 'content-agent', description: 'Delegate to the Content Agent' },
      { id: 'instagram-agent', description: 'Delegate to the Instagram Agent' },
      { id: 'browser-agent', description: 'Delegate to the Browser Agent' },
      { id: 'messaging-agent', description: 'Delegate to the Messaging Agent (Slack, Teams, Discord)' },
      { id: 'docs-agent', description: 'Delegate to the Docs Agent (Google Docs, Sheets, Airtable, Notion)' },
      { id: 'crm-agent', description: 'Delegate to the CRM Agent (HubSpot, Salesforce, Pipedrive, Zoho)' },
      { id: 'project-agent', description: 'Delegate to the Project Agent (Jira, Asana, Monday.com)' },
      { id: 'real-estate-agent', description: 'Delegate to the Real Estate Agent (Follow Up Boss, Calendly)' },
      { id: 'finance-agent', description: 'Delegate to the Finance Agent (Stripe, QuickBooks)' },
      { id: 'marketing-agent', description: 'Delegate to the Marketing Agent (Mailchimp)' },
      { id: 'metaAdsAgent', description: 'Delegate to the Meta Ads Agent (Facebook/Instagram ads)' },
      { id: 'ads-scraper-agent', description: 'Delegate to the Ads Scraper (Search API ad libraries)' },
      { id: 'ad-analyzer-agent', description: 'Delegate to the Ad Analyzer (competitive insights)' },
      { id: 'campaign-builder-agent', description: 'Delegate to the Campaign Builder (briefs)' },
      { id: 'mem0-recall', description: 'Search long-term memory' },
      { id: 'mem0-memorize', description: 'Save to long-term memory' },
    ],
  },
  {
    id: 'email',
    name: 'Email Agent',
    role: 'Email Communication',
    description:
      'Reads your inbox, summarizes messages, drafts replies, and sends emails on your behalf. Always shows a full draft and waits for your confirmation before sending anything.',
    model: 'Claude Sonnet',
    icon: Mail,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    tools: [
      { id: 'gmail-read', description: 'Fetch unread emails from Gmail' },
      { id: 'gmail-send', description: 'Send an email (requires confirmation)' },
      { id: 'gmail-reply', description: 'Reply to a thread (requires confirmation)' },
      { id: 'mem0-recall', description: 'Retrieve brand voice and writing preferences' },
      { id: 'mem0-memorize', description: 'Save preferences for future reference' },
    ],
  },
  {
    id: 'research',
    name: 'Research Agent',
    role: 'Web Research',
    description:
      'Searches the web, synthesizes findings, and returns structured summaries with cited sources. Runs multiple searches in parallel for breadth-first research.',
    model: 'Claude Haiku',
    icon: Search,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    tools: [
      { id: 'web-search (fast)', description: 'Tavily — quick facts and news' },
      { id: 'web-search (deep)', description: 'Exa — comprehensive research' },
      { id: 'mem0-recall', description: 'Retrieve past research and context' },
      { id: 'mem0-memorize', description: 'Save findings for future reference' },
    ],
  },
  {
    id: 'calendar',
    name: 'Calendar Agent',
    role: 'Schedule Management',
    description:
      'Views your schedule, lists upcoming events, and creates new calendar entries. Identifies availability windows and flags scheduling conflicts.',
    model: 'Claude Sonnet',
    icon: Calendar,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    tools: [
      { id: 'calendar-list', description: 'List today\'s and upcoming events' },
      { id: 'calendar-create', description: 'Create a new calendar event' },
      { id: 'mem0-recall', description: 'Retrieve scheduling preferences' },
      { id: 'mem0-memorize', description: 'Save scheduling preferences' },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Agent',
    role: 'LinkedIn Outreach',
    description:
      'Researches LinkedIn profiles, drafts personalized outreach messages, and manages DM campaigns. Always confirms before sending. First messages are capped at 300 characters.',
    model: 'Claude Sonnet',
    icon: Linkedin,
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-400',
    tools: [
      { id: 'linkedin-profile', description: 'Fetch a LinkedIn profile by URL' },
      { id: 'linkedin-dm', description: 'Send a LinkedIn DM (requires confirmation)' },
      { id: 'linkedin-search', description: 'Search for people on LinkedIn' },
      { id: 'web-search', description: 'Background research on people and companies' },
      { id: 'mem0-recall', description: 'Retrieve ICP criteria and brand voice' },
      { id: 'mem0-memorize', description: 'Save successful outreach patterns' },
    ],
  },
  {
    id: 'content',
    name: 'Content Agent',
    role: 'Content Creation',
    description:
      'Writes LinkedIn posts, newsletters, tweets, marketing copy, and any professional content. Recalls your brand voice from memory and shows a full draft before publishing.',
    model: 'Claude Sonnet',
    icon: PenLine,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    tools: [
      { id: 'web-search', description: 'Research, news hooks, and supporting data' },
      { id: 'mem0-recall', description: 'Retrieve brand voice and past approved content' },
      { id: 'mem0-memorize', description: 'Save tone preferences and approved examples' },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram Agent',
    role: 'Instagram Outreach',
    description:
      'Sends Instagram DMs and manages outreach campaigns. Casual, authentic tone. Cold outreach messages are capped at 200 characters. Always confirms before sending.',
    model: 'Claude Sonnet',
    icon: Camera,
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-400',
    tools: [
      { id: 'instagram-send-dm', description: 'Send a DM (requires confirmation)' },
      { id: 'mem0-recall', description: 'Retrieve brand voice and messaging patterns' },
      { id: 'mem0-memorize', description: 'Save outcomes and what worked' },
    ],
  },
  {
    id: 'browser',
    name: 'Browser Agent',
    role: 'Web Automation',
    description:
      'Navigates websites, extracts content from pages, and fills web forms. Announces every significant action before taking it. Always confirms before submitting forms.',
    model: 'Claude Sonnet',
    icon: Globe,
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
    tools: [
      { id: 'browser-navigate', description: 'Visit a URL and read page content' },
      { id: 'browser-extract', description: 'Extract specific content from a page' },
      { id: 'browser-fill-form', description: 'Fill and submit forms (requires confirmation)' },
      { id: 'web-search', description: 'Search before navigating when URL is unknown' },
      { id: 'mem0-recall', description: 'Retrieve saved procedures and automation workflows' },
      { id: 'mem0-memorize', description: 'Save useful procedures for future automation' },
    ],
  },
  {
    id: 'messaging',
    name: 'Messaging Agent',
    role: 'Slack, Teams, Discord',
    description:
      'Lists channels and users, sends messages in Slack, Microsoft Teams, and Discord. Always confirms before sending.',
    model: 'Claude Haiku',
    icon: MessageSquare,
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
    tools: [
      { id: 'MCP tools', description: 'Slack, Teams, Discord — list channels, send messages' },
      { id: 'mem0-recall', description: 'Retrieve messaging preferences' },
      { id: 'mem0-memorize', description: 'Save messaging preferences' },
    ],
  },
  {
    id: 'docs',
    name: 'Docs Agent',
    role: 'Google Docs, Sheets, Airtable, Notion',
    description:
      'Searches, reads, and creates documents in Google Docs, Sheets, Airtable, and Notion.',
    model: 'Claude Haiku',
    icon: FileText,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    tools: [
      { id: 'MCP tools', description: 'Google Docs, Sheets, Airtable, Notion — search, read, create' },
      { id: 'mem0-recall', description: 'Retrieve doc preferences' },
      { id: 'mem0-memorize', description: 'Save doc preferences' },
    ],
  },
  {
    id: 'crm',
    name: 'CRM Agent',
    role: 'HubSpot, Salesforce, Pipedrive, Zoho CRM',
    description:
      'Manages contacts, deals, companies, tasks, and notes across CRM integrations.',
    model: 'Claude Haiku',
    icon: BarChart2,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    tools: [
      { id: 'MCP tools', description: 'HubSpot, Salesforce, Pipedrive, Zoho — contacts, deals, tasks' },
      { id: 'mem0-recall', description: 'Retrieve CRM preferences' },
      { id: 'mem0-memorize', description: 'Save CRM preferences' },
    ],
  },
  {
    id: 'project',
    name: 'Project Agent',
    role: 'Jira, Asana, Monday.com',
    description:
      'Manages issues, tasks, projects, boards, sprints, and updates across project management tools.',
    model: 'Claude Haiku',
    icon: Kanban,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    tools: [
      { id: 'MCP tools', description: 'Jira, Asana, Monday.com — issues, tasks, projects, boards' },
      { id: 'mem0-recall', description: 'Retrieve project preferences' },
      { id: 'mem0-memorize', description: 'Save project preferences' },
    ],
  },
  {
    id: 'realEstate',
    name: 'Real Estate Agent',
    role: 'Follow Up Boss, Calendly',
    description:
      'Manages contacts, deals, tasks in Follow Up Boss and event types and scheduling in Calendly.',
    model: 'Claude Haiku',
    icon: Home,
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
    tools: [
      { id: 'MCP tools', description: 'Follow Up Boss, Calendly — contacts, deals, tasks, events' },
      { id: 'mem0-recall', description: 'Retrieve real estate preferences' },
      { id: 'mem0-memorize', description: 'Save real estate preferences' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance Agent',
    role: 'Stripe, QuickBooks',
    description:
      'Manages customers, charges, invoices, and payments in Stripe and QuickBooks.',
    model: 'Claude Haiku',
    icon: CreditCard,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    tools: [
      { id: 'MCP tools', description: 'Stripe, QuickBooks — customers, invoices, payments' },
      { id: 'mem0-recall', description: 'Retrieve finance preferences' },
      { id: 'mem0-memorize', description: 'Save finance preferences' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Agent',
    role: 'Mailchimp',
    description:
      'Manages audiences and campaigns in Mailchimp.',
    model: 'Claude Haiku',
    icon: Megaphone,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
    tools: [
      { id: 'MCP tools', description: 'Mailchimp — audiences, campaigns' },
      { id: 'mem0-recall', description: 'Retrieve marketing preferences' },
      { id: 'mem0-memorize', description: 'Save marketing preferences' },
    ],
  },
  {
    id: 'metaAds',
    name: 'Meta Ads Agent',
    role: 'Meta Ads',
    description:
      'Manages Facebook and Instagram advertising: campaigns, ad sets, creatives, audiences, and performance insights via the Meta Marketing API.',
    model: 'Claude Haiku',
    icon: LineChart,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    tools: [
      { id: 'MCP tools', description: 'Meta Ads — campaigns, insights, creatives, audiences' },
      { id: 'mem0-recall', description: 'Retrieve ad preferences and benchmarks' },
      { id: 'mem0-memorize', description: 'Save performance notes' },
    ],
  },
  {
    id: 'adsScraper',
    name: 'Ads Scraper',
    role: 'Search API — ad libraries',
    description:
      'Runs competitive searches across Meta, LinkedIn, TikTok, and Google ad transparency surfaces via Composio SEARCH_API. Uses parallel SEARCH_API_SEARCH calls per engine when multiple platforms are selected.',
    model: 'Claude Sonnet',
    icon: Radar,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    tools: [
      { id: 'SEARCH_API_SEARCH', description: 'Query ad-library engines (engine + q)' },
      { id: 'SEARCH_API_GET_CACHED_SEARCH_BY_ID', description: 'Fetch cached JSON by search id' },
      { id: 'mem0-recall', description: 'Retrieve scraping preferences' },
      { id: 'mem0-memorize', description: 'Save successful query patterns' },
    ],
  },
  {
    id: 'adAnalyzer',
    name: 'Ad Analyzer',
    role: 'Competitive analysis',
    description:
      'Turns Search API results into structured competitive insights: themes, messaging, creative patterns, and gaps.',
    model: 'Claude Sonnet',
    icon: Target,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
    tools: [
      { id: 'SEARCH_API_GET_CACHED_SEARCH_BY_ID', description: 'Rehydrate cached ad search JSON' },
      { id: 'SEARCH_API_SEARCH', description: 'Optional new query if context is missing' },
      { id: 'mem0-recall', description: 'Retrieve analysis preferences' },
      { id: 'mem0-memorize', description: 'Save analysis templates' },
    ],
  },
  {
    id: 'campaignBuilder',
    name: 'Campaign Builder',
    role: 'Campaign briefs',
    description:
      'Converts competitive analysis into an actionable campaign brief: objectives, audiences, angles, channels, and metrics.',
    model: 'Claude Sonnet',
    icon: Rocket,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    tools: [
      { id: 'SEARCH_API_GET_CACHED_SEARCH_BY_ID', description: 'Optional data refresh from cache' },
      { id: 'mem0-recall', description: 'Retrieve brand and ICP context' },
      { id: 'mem0-memorize', description: 'Save brief preferences' },
    ],
  },
]

const STORAGE_KEY = 'agent-custom-instructions'

function loadLegacyInstructions(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { user } = useUser()
  const { config } = useOrgConfig()
  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )
  const serverSettings = useQuery(
    api.userAgentSettings.getByUserId,
    dbUser ? { userId: dbUser._id } : 'skip'
  )
  const upsertSettings = useMutation(api.userAgentSettings.upsert)
  const clearAgentMut = useMutation(api.userAgentSettings.clearAgent)

  const [customInstructions, setCustomInstructions] = useState<Record<string, string>>({})
  const [selectedAgent, setSelectedAgent] = useState<AgentDef | null>(null)
  const [draftInstructions, setDraftInstructions] = useState('')
  const [saved, setSaved] = useState(false)
  const [migratedLegacy, setMigratedLegacy] = useState(false)

  useEffect(() => {
    if (!serverSettings || !dbUser) return
    const fromServer = serverSettings.instructionsByAgentId ?? {}
    if (Object.keys(fromServer).length > 0) {
      setCustomInstructions(fromServer)
      return
    }
    if (migratedLegacy) return
    const legacy = loadLegacyInstructions()
    if (Object.keys(legacy).length === 0) {
      setMigratedLegacy(true)
      return
    }
    void upsertSettings({
      userId: dbUser._id,
      tenantId: dbUser.tenantId,
      instructionsByAgentId: legacy,
    }).then(() => {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      setMigratedLegacy(true)
    })
  }, [serverSettings, dbUser, upsertSettings, migratedLegacy])

  useEffect(() => {
    if (serverSettings?.instructionsByAgentId) {
      setCustomInstructions(serverSettings.instructionsByAgentId)
    }
  }, [serverSettings])

  function openAgent(agent: AgentDef, locked?: boolean) {
    if (locked) return
    setSelectedAgent(agent)
    setDraftInstructions(customInstructions[agent.id] ?? '')
    setSaved(false)
  }

  function closeModal() {
    setSelectedAgent(null)
    setDraftInstructions('')
    setSaved(false)
  }

  const handleSave = useCallback(async () => {
    if (!selectedAgent || !dbUser) return
    const updated = { ...customInstructions, [selectedAgent.id]: draftInstructions }
    setCustomInstructions(updated)
    await upsertSettings({
      userId: dbUser._id,
      tenantId: dbUser.tenantId,
      instructionsByAgentId: updated,
    })
    setSaved(true)
  }, [
    selectedAgent,
    dbUser,
    customInstructions,
    draftInstructions,
    upsertSettings,
  ])

  const handleClear = useCallback(async () => {
    if (!selectedAgent || !dbUser) return
    const updated = { ...customInstructions }
    delete updated[selectedAgent.id]
    setCustomInstructions(updated)
    await clearAgentMut({
      userId: dbUser._id,
      tenantId: dbUser.tenantId,
      agentId: selectedAgent.id,
    })
    setDraftInstructions('')
    setSaved(false)
  }, [selectedAgent, dbUser, customInstructions, clearAgentMut])

  const configuredCount = Object.values(customInstructions).filter(Boolean).length

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Agents</h1>
          <p className="mt-1 text-[15px] text-gray-400">
            Your AI agent team. Each specialist handles a domain and can be called in parallel.
            {configuredCount > 0 && (
              <span className="ml-1.5 tabular-nums text-gray-500">
                {configuredCount} {configuredCount === 1 ? 'agent' : 'agents'} with custom instructions
              </span>
            )}
          </p>
        </div>

        {/* Orchestrator — featured card */}
        {AGENTS.filter((a) => a.isOrchestrator).map((agent) => {
          const Icon = agent.icon
          const hasInstructions = Boolean(customInstructions[agent.id])
          return (
            <div
              key={agent.id}
              className="rounded-xl border border-brand-600/20 bg-brand-600/5 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${agent.iconBg}`}
                    aria-hidden="true"
                  >
                    <Icon className={`h-5 w-5 ${agent.iconColor}`} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{agent.name}</p>
                      <span className="rounded-full bg-brand-600/20 px-2 py-0.5 text-[11px] font-medium text-brand-400">
                        Lead Agent
                      </span>
                      {hasInstructions && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                          Custom instructions
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{agent.role} · {agent.model}</p>
                    <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">{agent.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openAgent(agent)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Configure
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        {/* Sub-agents list */}
        <section aria-label="Specialist agents">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-600">
            Specialist Agents
          </p>
          <div className="rounded-xl border border-white/10 bg-card/80 backdrop-blur-md">
            <ul className="divide-y divide-gray-800/60" role="list">
              {AGENTS.filter((a) => !a.isOrchestrator).map((agent) => {
                const Icon = agent.icon
                const hasInstructions = Boolean(customInstructions[agent.id])
                const locked = !isAgentAllowed(config, agent.id)
                return (
                  <li
                    key={agent.id}
                    className={cn(
                      'flex items-center justify-between gap-4 px-5 py-4 transition-colors',
                      locked ? 'opacity-60' : 'hover:bg-accent/50'
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${agent.iconBg}`}
                        aria-hidden="true"
                      >
                        <Icon className={`h-3.5 w-3.5 ${agent.iconColor}`} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{agent.name}</p>
                          {locked && (
                            <span className="flex items-center gap-1 rounded-full bg-gray-600/20 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                              <Lock className="h-2.5 w-2.5" />
                              Locked
                            </span>
                          )}
                          {hasInstructions && !locked && (
                            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                              Customized
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{agent.role} · {agent.model} · {agent.tools.length} tools</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAgent(agent, locked)}
                      disabled={locked}
                      title={locked ? 'Contact your admin to request access' : undefined}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                        locked
                          ? 'cursor-not-allowed border-border bg-transparent text-muted-foreground'
                          : 'border-border bg-transparent text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground'
                      )}
                    >
                      {locked ? 'Contact admin' : 'Configure'}
                      {!locked && <ChevronRight className="h-3 w-3" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* Info callout */}
        <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-card/60 backdrop-blur-md px-4 py-3">
          <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" aria-hidden="true" />
          <p className="text-xs text-gray-500 leading-relaxed">
            All requests go through the <span className="text-gray-400">Orchestrator</span>, which decides which specialist agents to call — often in parallel. You never talk to sub-agents directly; the Orchestrator coordinates everything and gives you one unified response.
          </p>
        </div>
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedAgent.name} configuration`}
        >
          <div className="mx-4 flex w-full max-w-2xl flex-col rounded-xl border border-white/10 bg-card/90 backdrop-blur-xl shadow-2xl max-h-[90vh]">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${selectedAgent.iconBg}`}
                  aria-hidden="true"
                >
                  {(() => {
                    const Icon = selectedAgent.icon
                    return <Icon className={`h-4 w-4 ${selectedAgent.iconColor}`} />
                  })()}
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-white">{selectedAgent.name}</h2>
                  <p className="text-xs text-gray-500">{selectedAgent.role} · {selectedAgent.model}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

              {/* Description */}
              <div>
                <p className="text-sm text-gray-300 leading-relaxed">{selectedAgent.description}</p>
              </div>

              {/* Tools */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tools ({selectedAgent.tools.length})
                  </span>
                </div>
                <ul className="space-y-1" role="list">
                  {selectedAgent.tools.map((tool) => (
                    <li
                      key={tool.id}
                      className="flex items-baseline gap-2.5 rounded-lg bg-muted/60 px-3 py-2"
                    >
                      <code className="shrink-0 font-mono text-[11px] text-brand-400">{tool.id}</code>
                      <span className="text-xs text-gray-500">{tool.description}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Custom Instructions */}
              <div>
                <label
                  htmlFor="custom-instructions"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Custom Instructions
                </label>
                <textarea
                  id="custom-instructions"
                  value={draftInstructions}
                  onChange={(e) => { setDraftInstructions(e.target.value); setSaved(false) }}
                  placeholder={`Add extra instructions for the ${selectedAgent.name}.\n\nExamples:\n• Always respond in Spanish\n• My preferred email sign-off is "Best, Jamie"\n• Never use bullet points in responses`}
                  rows={6}
                  className="w-full rounded-lg border border-input bg-background/80 px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                />
                <p className="mt-1.5 text-xs text-gray-600">
                  These instructions are appended to this agent&apos;s system prompt on every request.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={handleClear}
                disabled={!draftInstructions}
                className="text-xs text-gray-600 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-0"
              >
                Clear instructions
              </button>
              <div className="flex items-center gap-3">
                {saved && (
                  <span className="text-xs text-green-400" role="status">Saved</span>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-input bg-background/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Save Instructions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
