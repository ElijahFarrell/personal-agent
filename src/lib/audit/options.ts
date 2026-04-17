/** Single-select and multi-select options for the audit questionnaire. */

export const ROLE_OPTIONS = [
  { value: 'founder', label: 'Founder / Owner' },
  { value: 'operator', label: 'Operator / GM' },
  { value: 'team_lead', label: 'Team Lead / Manager' },
  { value: 'ic', label: 'Individual Contributor' },
  { value: 'consultant', label: 'Consultant / Freelancer' },
  { value: 'other', label: 'Other' },
] as const

export const TEAM_SIZE_OPTIONS = [
  { value: '1', label: 'Just me' },
  { value: '2-5', label: '2-5 people' },
  { value: '6-15', label: '6-15 people' },
  { value: '16-50', label: '16-50 people' },
  { value: '50+', label: '50+' },
] as const

/**
 * Common industry buckets. The free-text "other" path captures everything
 * we missed, and feeds the Tavily research step on submit.
 */
export const INDUSTRY_OPTIONS = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'professional_services', label: 'Professional Services / Consulting' },
  { value: 'agency_marketing', label: 'Marketing / Creative Agency' },
  { value: 'ecommerce_retail', label: 'E-commerce / Retail' },
  { value: 'saas_software', label: 'SaaS / Software' },
  { value: 'healthcare', label: 'Healthcare / Medical' },
  { value: 'finance', label: 'Finance / Insurance' },
  { value: 'legal', label: 'Legal' },
  { value: 'home_services', label: 'Home Services / Trades' },
  { value: 'hospitality', label: 'Hospitality / Restaurants' },
  { value: 'education', label: 'Education / Coaching' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'manufacturing', label: 'Manufacturing / Logistics' },
  { value: 'other', label: 'Other' },
] as const

export const WEEKLY_MANUAL_HOURS_OPTIONS = [
  { value: 'lt5', label: 'Less than 5 hours' },
  { value: '5-10', label: '5-10 hours' },
  { value: '10-20', label: '10-20 hours' },
  { value: '20-30', label: '20-30 hours' },
  { value: '30+', label: '30+ hours (most of my week)' },
] as const

export const TOOL_OPTIONS = [
  { value: 'crm', label: 'CRM (HubSpot, Salesforce, Pipedrive, etc.)' },
  { value: 'email_mkt', label: 'Email marketing (Mailchimp, ConvertKit, Klaviyo, etc.)' },
  { value: 'social', label: 'Social media scheduling (Buffer, Hootsuite, Later, etc.)' },
  { value: 'project_mgmt', label: 'Project management (Asana, Notion, ClickUp, Linear, etc.)' },
  { value: 'comms', label: 'Internal comms (Slack, Teams, etc.)' },
  { value: 'support', label: 'Customer support / helpdesk (Zendesk, Intercom, etc.)' },
  { value: 'scheduling', label: 'Scheduling / booking (Calendly, Acuity, etc.)' },
  { value: 'sheets', label: 'Spreadsheets for tracking (Google Sheets, Excel)' },
  { value: 'ai_tools', label: 'AI tools (ChatGPT, Claude, etc.)' },
  { value: 'other', label: 'Other' },
] as const

export const BIGGEST_CHALLENGE_OPTIONS = [
  { value: 'not_enough_leads', label: 'Not enough leads / pipeline' },
  { value: 'cant_follow_up', label: "Plenty of leads, can't follow up fast enough" },
  { value: 'leads_go_cold', label: 'Leads go cold before I can get to them' },
  { value: 'admin_time', label: 'Too much time on admin, not enough on the real work' },
  { value: 'team_inconsistent', label: "My team isn't consistent with processes" },
  { value: 'scale', label: "I can't scale without hiring more people" },
  { value: 'other', label: 'Other' },
] as const

export const AI_EXPERIENCE_OPTIONS = [
  { value: 'none', label: 'No, never' },
  { value: 'casual', label: "I've played with ChatGPT / AI tools casually" },
  { value: 'tried', label: "Yes, I've tried to implement AI but it didn't stick" },
  { value: 'active', label: 'Yes, I actively use AI tools in my workflow' },
] as const

export const MONTHLY_LEADS_OPTIONS = [
  { value: 'lt10', label: 'Less than 10' },
  { value: '10-30', label: '10-30' },
  { value: '30-75', label: '30-75' },
  { value: '75-150', label: '75-150' },
  { value: '150+', label: '150+' },
] as const

export const ANNUAL_REVENUE_OPTIONS = [
  { value: 'prefer_not', label: 'Prefer not to say' },
  { value: 'lt100k', label: 'Under $100K' },
  { value: '100-250k', label: '$100K - $250K' },
  { value: '250-500k', label: '$250K - $500K' },
  { value: '500k-1m', label: '$500K - $1M' },
  { value: '1m+', label: '$1M+' },
] as const
