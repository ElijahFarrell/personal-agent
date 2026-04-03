import type { WorkflowDefinition } from '@/services/workflowCompilerService'

export interface WorkflowTemplateMeta {
  id: string
  name: string
  description: string
  /** Niche hint for UI filtering */
  niche?: 'real_estate' | 'generic'
  definition: WorkflowDefinition
}

function def(d: WorkflowDefinition): WorkflowDefinition {
  return d
}

/**
 * Starter graphs for real estate voice/SMS automation.
 * Sleep durations are short in examples; use Convex scheduled functions for multi-day gaps in production.
 */
export const REAL_ESTATE_WORKFLOW_TEMPLATES: WorkflowTemplateMeta[] = [
  {
    id: 'post-call-sms',
    name: 'Post-call SMS follow-up',
    description:
      'After a call, use the real estate agent to summarize intent, then send SMS via Composio (connect SMS Alert).',
    niche: 'real_estate',
    definition: def({
      nodes: [
        {
          id: 'start',
          type: 'start',
          position: { x: 0, y: 120 },
          data: { label: 'Start' },
        },
        {
          id: 'qualify',
          type: 'agent',
          position: { x: 220, y: 120 },
          data: {
            label: 'Summarize call',
            agentId: 'realEstate',
            prompt:
              'Summarize the prior step input as a short SMS follow-up (max 300 chars) for a real estate lead. Output only the SMS body text.',
            config: {
              agentId: 'realEstate',
              prompt:
                'Summarize the prior step input as a short SMS follow-up (max 300 chars) for a real estate lead. Output only the SMS body text.',
            },
          },
        },
        {
          id: 'sms',
          type: 'sms',
          position: { x: 480, y: 120 },
          data: {
            label: 'Send SMS',
            toolParams: {
              message: '{{value}}',
            },
            config: {
              toolParams: {
                message: '{{value}}',
              },
            },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'qualify' },
        { id: 'e2', source: 'qualify', target: 'sms' },
      ],
    }),
  },
  {
    id: 'speed-to-lead',
    name: 'Speed-to-lead (SMS + call)',
    description:
      'Send an instant SMS, short pause, then trigger a Retell outbound call (configure tool arguments for your Composio tools).',
    niche: 'real_estate',
    definition: def({
      nodes: [
        {
          id: 'start',
          type: 'start',
          position: { x: 0, y: 120 },
          data: { label: 'Start' },
        },
        {
          id: 'sms1',
          type: 'sms',
          position: { x: 200, y: 120 },
          data: {
            label: 'Instant SMS',
            toolParams: {
              body: 'Thanks for your inquiry! We will call you in a moment.',
            },
            config: {
              toolParams: {
                body: 'Thanks for your inquiry! We will call you in a moment.',
              },
            },
          },
        },
        {
          id: 'wait',
          type: 'sleep',
          position: { x: 400, y: 120 },
          data: {
            label: 'Wait (demo 5s)',
            milliseconds: 5000,
            config: { milliseconds: 5000 },
          },
        },
        {
          id: 'call',
          type: 'voice_call',
          position: { x: 600, y: 120 },
          data: {
            label: 'AI call',
            toolParams: {},
            config: { toolParams: {} },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'sms1' },
        { id: 'e2', source: 'sms1', target: 'wait' },
        { id: 'e3', source: 'wait', target: 'call' },
      ],
    }),
  },
  {
    id: 'appointment-reminder',
    name: 'Appointment reminder (email + SMS)',
    description:
      'Send Mailchimp email then SMS reminder — connect Mailchimp, SMS Alert, and override Composio tool slugs if needed.',
    niche: 'real_estate',
    definition: def({
      nodes: [
        {
          id: 'start',
          type: 'start',
          position: { x: 0, y: 120 },
          data: { label: 'Start' },
        },
        {
          id: 'email',
          type: 'email',
          position: { x: 220, y: 120 },
          data: {
            label: 'Email reminder',
            emailProvider: 'mailchimp',
            toolParams: {},
            config: { emailProvider: 'mailchimp', toolParams: {} },
          },
        },
        {
          id: 'sms',
          type: 'sms',
          position: { x: 480, y: 120 },
          data: {
            label: 'SMS reminder',
            toolParams: { body: 'Reminder: your showing is coming up.' },
            config: {
              toolParams: { body: 'Reminder: your showing is coming up.' },
            },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'email' },
        { id: 'e2', source: 'email', target: 'sms' },
      ],
    }),
  },
]

export const WARM_LEAD_WORKFLOW_TEMPLATES: WorkflowTemplateMeta[] = [
  {
    id: 'warm-lead-past-client-follow-up',
    name: 'Past client follow-up (email + SMS)',
    description:
      'Send a personalized check-in email, then a follow-up SMS reminder one day later.',
    niche: 'generic',
    definition: def({
      nodes: [
        { id: 'start', type: 'start', position: { x: 0, y: 120 }, data: { label: 'Start' } },
        {
          id: 'email',
          type: 'email',
          position: { x: 220, y: 120 },
          data: {
            label: 'Check-in email',
            emailProvider: 'mailchimp',
            toolParams: {
              subject: 'Quick check-in',
              body: 'Hi! Checking in to see if you need help with buying, selling, or referrals this season.',
            },
            config: {
              emailProvider: 'mailchimp',
              toolParams: {
                subject: 'Quick check-in',
                body: 'Hi! Checking in to see if you need help with buying, selling, or referrals this season.',
              },
            },
          },
        },
        {
          id: 'wait',
          type: 'sleep',
          position: { x: 460, y: 120 },
          data: {
            label: 'Wait 1 day',
            milliseconds: 24 * 60 * 60 * 1000,
            config: { milliseconds: 24 * 60 * 60 * 1000 },
          },
        },
        {
          id: 'sms',
          type: 'sms',
          position: { x: 680, y: 120 },
          data: {
            label: 'Follow-up SMS',
            toolParams: {
              body: 'Quick follow-up on my note yesterday. Happy to help or answer any market questions.',
            },
            config: {
              toolParams: {
                body: 'Quick follow-up on my note yesterday. Happy to help or answer any market questions.',
              },
            },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'email' },
        { id: 'e2', source: 'email', target: 'wait' },
        { id: 'e3', source: 'wait', target: 'sms' },
      ],
    }),
  },
  {
    id: 'warm-lead-referral-ask',
    name: 'Referral request sequence',
    description:
      'Send a referral ask email, then an SMS follow-up after 3 days.',
    niche: 'generic',
    definition: def({
      nodes: [
        { id: 'start', type: 'start', position: { x: 0, y: 120 }, data: { label: 'Start' } },
        {
          id: 'email',
          type: 'email',
          position: { x: 220, y: 120 },
          data: {
            label: 'Referral ask email',
            emailProvider: 'mailchimp',
            toolParams: {
              subject: 'Quick favor',
              body: 'If anyone in your circle is thinking about moving, I would appreciate an introduction.',
            },
            config: {
              emailProvider: 'mailchimp',
              toolParams: {
                subject: 'Quick favor',
                body: 'If anyone in your circle is thinking about moving, I would appreciate an introduction.',
              },
            },
          },
        },
        {
          id: 'wait',
          type: 'sleep',
          position: { x: 460, y: 120 },
          data: {
            label: 'Wait 3 days',
            milliseconds: 3 * 24 * 60 * 60 * 1000,
            config: { milliseconds: 3 * 24 * 60 * 60 * 1000 },
          },
        },
        {
          id: 'sms',
          type: 'sms',
          position: { x: 680, y: 120 },
          data: {
            label: 'Referral follow-up SMS',
            toolParams: {
              body: 'Friendly follow-up: if someone comes to mind, I would be grateful for an intro.',
            },
            config: {
              toolParams: {
                body: 'Friendly follow-up: if someone comes to mind, I would be grateful for an intro.',
              },
            },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'email' },
        { id: 'e2', source: 'email', target: 'wait' },
        { id: 'e3', source: 'wait', target: 'sms' },
      ],
    }),
  },
]
