import type { NichePack } from './types'

export const NICHE_PACKS: Record<NichePack['id'], NichePack> = {
  generic: {
    id: 'generic',
    label: 'General',
    orchestratorContext: '',
    skillIndexGlobs: [],
    workflowTemplateIds: [],
    agentProfiles: {},
  },
  real_estate: {
    id: 'real_estate',
    label: 'Real estate',
    orchestratorContext: `
## Vertical context (real estate)

The user is in **real estate** — listings, buyers/sellers, showings, follow-ups, and CRM pipelines (e.g. Follow Up Boss, Calendly). Prefer the **real-estate-agent** for scheduling and real-estate CRM tasks when connected. Use **crm-agent** for generic CRMs when the task is not real-estate-specific.
`.trim(),
    skillIndexGlobs: ['/skills/niches/real_estate/**/*.md'],
    workflowTemplateIds: [],
    agentProfiles: {},
  },
}
