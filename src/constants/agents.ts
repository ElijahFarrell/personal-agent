/**
 * Agent registry for @mention picker, agents page, orchestrator prompt, and agentTools.
 * Maps agent IDs to display names, descriptions, and icons.
 */
import type { LucideIcon } from 'lucide-react'
import {
  Mail,
  Search,
  Calendar,
  Linkedin,
  PenLine,
  Camera,
  Globe,
  MessageSquare,
  FileText,
  BarChart2,
  Kanban,
  Home,
  CreditCard,
  Megaphone,
  LineChart,
  Radar,
  Target,
  Rocket,
} from 'lucide-react'

export const AGENT_IDS = {
  EMAIL: 'email',
  RESEARCH: 'research',
  CALENDAR: 'calendar',
  LINKEDIN: 'linkedin',
  CONTENT: 'content',
  INSTAGRAM: 'instagram',
  BROWSER: 'browser',
  MESSAGING: 'messaging',
  DOCS: 'docs',
  CRM: 'crm',
  PROJECT: 'project',
  REAL_ESTATE: 'realEstate',
  FINANCE: 'finance',
  MARKETING: 'marketing',
  META_ADS: 'metaAds',
  ADS_SCRAPER: 'adsScraper',
  AD_ANALYZER: 'adAnalyzer',
  CAMPAIGN_BUILDER: 'campaignBuilder',
} as const

export type AgentId = (typeof AGENT_IDS)[keyof typeof AGENT_IDS]

export interface AgentMeta {
  id: AgentId
  displayName: string
  description: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  /** Tool ID used in agentTools (e.g. 'email-agent') */
  toolId: string
}

export const AGENT_REGISTRY: AgentMeta[] = [
  {
    id: AGENT_IDS.EMAIL,
    displayName: 'Email',
    description: 'Read inbox, draft replies, send emails',
    icon: Mail,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    toolId: 'email-agent',
  },
  {
    id: AGENT_IDS.RESEARCH,
    displayName: 'Research',
    description: 'Web search, fact-finding, market research',
    icon: Search,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    toolId: 'research-agent',
  },
  {
    id: AGENT_IDS.CALENDAR,
    displayName: 'Calendar',
    description: 'View schedule, create events, check availability',
    icon: Calendar,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    toolId: 'calendar-agent',
  },
  {
    id: AGENT_IDS.LINKEDIN,
    displayName: 'LinkedIn',
    description: 'Research profiles, draft outreach, DM campaigns',
    icon: Linkedin,
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-400',
    toolId: 'linkedin-agent',
  },
  {
    id: AGENT_IDS.CONTENT,
    displayName: 'Content',
    description: 'Write posts, newsletters, marketing copy',
    icon: PenLine,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    toolId: 'content-agent',
  },
  {
    id: AGENT_IDS.INSTAGRAM,
    displayName: 'Instagram',
    description: 'Send Instagram DMs and outreach',
    icon: Camera,
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-400',
    toolId: 'instagram-agent',
  },
  {
    id: AGENT_IDS.BROWSER,
    displayName: 'Browser',
    description: 'Navigate sites, extract content, fill forms',
    icon: Globe,
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
    toolId: 'browser-agent',
  },
  {
    id: AGENT_IDS.MESSAGING,
    displayName: 'Messaging',
    description: 'Slack, Teams, Discord — list channels, send messages',
    icon: MessageSquare,
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
    toolId: 'messaging-agent',
  },
  {
    id: AGENT_IDS.DOCS,
    displayName: 'Docs',
    description: 'Google Docs, Sheets, Airtable, Notion',
    icon: FileText,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    toolId: 'docs-agent',
  },
  {
    id: AGENT_IDS.CRM,
    displayName: 'CRM',
    description: 'HubSpot, Salesforce, Pipedrive, Zoho CRM',
    icon: BarChart2,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    toolId: 'crm-agent',
  },
  {
    id: AGENT_IDS.PROJECT,
    displayName: 'Project',
    description: 'Jira, Asana, Monday.com — issues, tasks, boards',
    icon: Kanban,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    toolId: 'project-agent',
  },
  {
    id: AGENT_IDS.REAL_ESTATE,
    displayName: 'Real Estate',
    description: 'Follow Up Boss, Calendly — contacts, deals, events',
    icon: Home,
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
    toolId: 'real-estate-agent',
  },
  {
    id: AGENT_IDS.FINANCE,
    displayName: 'Finance',
    description: 'Stripe, QuickBooks — customers, invoices, payments',
    icon: CreditCard,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    toolId: 'finance-agent',
  },
  {
    id: AGENT_IDS.MARKETING,
    displayName: 'Marketing',
    description: 'Mailchimp — audiences, campaigns',
    icon: Megaphone,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
    toolId: 'marketing-agent',
  },
  {
    id: AGENT_IDS.META_ADS,
    displayName: 'Meta Ads',
    description: 'Facebook and Instagram ads — campaigns, creatives, insights',
    icon: LineChart,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    toolId: 'metaAdsAgent',
  },
  {
    id: AGENT_IDS.ADS_SCRAPER,
    displayName: 'Ads Scraper',
    description: 'Search API — competitive ads across Meta, LinkedIn, TikTok, Google',
    icon: Radar,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    toolId: 'ads-scraper-agent',
  },
  {
    id: AGENT_IDS.AD_ANALYZER,
    displayName: 'Ad Analyzer',
    description: 'Synthesize competitive ad research into insights',
    icon: Target,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
    toolId: 'ad-analyzer-agent',
  },
  {
    id: AGENT_IDS.CAMPAIGN_BUILDER,
    displayName: 'Campaign Builder',
    description: 'Turn analysis into a campaign brief and channel plan',
    icon: Rocket,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    toolId: 'campaign-builder-agent',
  },
]

export const AGENT_BY_ID = new Map(AGENT_REGISTRY.map((a) => [a.id, a]))
export const AGENT_BY_TOOL_ID = new Map(AGENT_REGISTRY.map((a) => [a.toolId, a]))
