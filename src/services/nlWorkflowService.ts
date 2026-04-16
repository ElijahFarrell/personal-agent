import { z } from 'zod'
import { generateObject } from 'ai'
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from '@/services/workflowCompilerService'
import { Models } from '@/constants/models'

const agentIdEnum = z.enum([
  'email',
  'research',
  'deepResearch',
  'calendar',
  'linkedin',
  'content',
  'instagram',
  'browser',
  'messaging',
  'docs',
  'crm',
  'project',
  'realEstate',
  'finance',
  'marketing',
  'metaAds',
  'adsScraper',
  'adAnalyzer',
  'campaignBuilder',
  'sdr',
])

const nlPlanSchema = z.object({
  name: z.string().describe('Short workflow title'),
  description: z.string().describe('One-line summary of what this automation does'),
  steps: z
    .array(
      z.object({
        agentId: agentIdEnum,
        label: z.string(),
        prompt: z
          .string()
          .describe('Task instructions for this agent step; may reference {{value}} from prior output'),
      })
    )
    .min(1)
    .max(12),
  schedule: z
    .object({
      cronExpression: z.string().describe('Standard cron, e.g. 0 9 * * 1 for Mon 9am'),
      timezone: z.string().describe('IANA timezone e.g. America/New_York'),
      runMode: z.enum(['workflow', 'agent_prompt']).describe('Run compiled workflow vs single orchestrator prompt'),
      agentPrompt: z
        .string()
        .optional()
        .describe('If runMode is agent_prompt, the prompt to send to the orchestrator'),
    })
    .optional(),
})

export type NlWorkflowPlan = z.infer<typeof nlPlanSchema>

export function buildWorkflowDefinitionFromPlan(plan: NlWorkflowPlan): WorkflowDefinition {
  const nodes: WorkflowNode[] = []
  const edges: WorkflowEdge[] = []

  const startId = 'start'
  nodes.push({
    id: startId,
    type: 'start',
    data: { label: 'Start' },
  })

  let prevId = startId
  plan.steps.forEach((step, i) => {
    const id = `agent_${i + 1}`
    nodes.push({
      id,
      type: 'agent',
      data: {
        label: step.label,
        config: {
          agentId: step.agentId,
          prompt: step.prompt,
        },
      },
    })
    edges.push({
      id: `e_${prevId}_${id}`,
      source: prevId,
      target: id,
    })
    prevId = id
  })

  const endId = 'end'
  nodes.push({ id: endId, type: 'end', data: { label: 'End' } })
  edges.push({
    id: `e_${prevId}_${endId}`,
    source: prevId,
    target: endId,
  })

  return { nodes, edges }
}

export async function generateWorkflowPlanFromNl(userRequest: string): Promise<NlWorkflowPlan> {
  const { object } = await generateObject({
    model: Models.GPT_4O_MINI(),
    schema: nlPlanSchema,
    prompt:
      `You are a workflow architect. Convert the user's automation request into a linear sequence of specialist agent steps.\n\n` +
      `Available agents (pick the minimum steps needed):\n` +
      `- email: Gmail/Outlook inbox, drafts, send\n` +
      `- research: fast web search (Tavily/Exa), citations — use for quick fact-finding\n` +
      `- deepResearch: deep Exa search with filters, Reddit/news/chart tools — use for thorough market or competitive research\n` +
      `- calendar: Google Calendar\n` +
      `- linkedin: profiles, outreach drafts\n` +
      `- content: posts, newsletters, copy\n` +
      `- instagram: DMs\n` +
      `- browser: navigate sites, extract content\n` +
      `- messaging: Slack, Teams, Discord, WhatsApp\n` +
      `- docs: Google Docs, Sheets, Notion, Airtable\n` +
      `- crm: HubSpot, Salesforce, Pipedrive, Zoho\n` +
      `- project: Asana, Monday\n` +
      `- realEstate: Follow Up Boss, Calendly\n` +
      `- finance: Stripe, QuickBooks\n` +
      `- marketing: Mailchimp, Lemlist\n` +
      `- metaAds: Meta/Facebook/Instagram ads\n` +
      `- adsScraper: competitive ad libraries (Meta, LinkedIn, TikTok, Google)\n` +
      `- adAnalyzer: analyze scraped ad research\n` +
      `- campaignBuilder: campaign brief from analysis\n` +
      `- sdr: Exa company search, Apollo, Outlook — lead gen and sequences\n\n` +
      `Each step must include a clear prompt the specialist can execute (may reference prior step output conceptually).\n` +
      `If the user asks for a recurring time (daily, weekly, etc.), fill schedule with a sensible cron and timezone America/New_York unless they specify otherwise.\n` +
      `If a schedule is appropriate, prefer runMode "workflow" to run this graph; use "agent_prompt" only for simple recurring tasks that fit a single orchestrator instruction.\n\n` +
      `User request:\n${userRequest}`,
  })
  return object
}
