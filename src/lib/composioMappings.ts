/**
 * Maps our IntegrationProvider to Composio toolkit slugs.
 * Excludes providers that require custom auth (pipedrive, jira, follow-up-boss).
 */
import type { ComposioProvider } from '@/types'

export const PROVIDER_TO_TOOLKIT: Record<ComposioProvider, string> = {
  gmail: 'GMAIL',
  'google-calendar': 'GOOGLECALENDAR',
  slack: 'SLACK',
  linkedin: 'LINKEDIN',
  instagram: 'INSTAGRAM',
  notion: 'NOTION',
  hubspot: 'HUBSPOT',
  salesforce: 'SALESFORCE',
  'zoho-crm': 'ZOHO_BIGIN',
  asana: 'ASANA',
  monday: 'MONDAY',
  'microsoft-teams': 'MICROSOFT_TEAMS',
  discord: 'DISCORD',
  'google-docs': 'GOOGLEDOCS',
  'google-sheet': 'GOOGLESHEETS',
  airtable: 'AIRTABLE',
  calendly: 'CALENDLY',
  stripe: 'STRIPE',
  quickbooks: 'QUICKBOOKS',
  mailchimp: 'MAILCHIMP',
  apollo: 'APOLLO',
  outlook: 'OUTLOOK',
} as const

export const TOOLKIT_TO_PROVIDER: Record<string, ComposioProvider> = Object.fromEntries(
  (Object.entries(PROVIDER_TO_TOOLKIT) as [ComposioProvider, string][]).map(
    ([provider, toolkit]) => [toolkit.toUpperCase(), provider]
  )
)

/** All Composio-backed providers (for status checks). */
export const COMPOSIO_PROVIDERS = Object.keys(
  PROVIDER_TO_TOOLKIT
) as ComposioProvider[]

export function getToolkitForProvider(provider: string): string | null {
  const p = provider.toLowerCase()
  return PROVIDER_TO_TOOLKIT[p as ComposioProvider] ?? null
}

export function getProviderForToolkit(toolkitSlug: string): ComposioProvider | null {
  const slug = toolkitSlug?.toUpperCase()
  return (TOOLKIT_TO_PROVIDER[slug] as ComposioProvider) ?? null
}
