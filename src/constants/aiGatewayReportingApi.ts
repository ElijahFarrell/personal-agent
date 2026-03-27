/**
 * Vercel AI Gateway Custom Reporting API — URL, query keys, and allowed values.
 * @see https://vercel.com/docs/ai-gateway/capabilities/custom-reporting
 */

export const AI_GATEWAY_REPORT_BASE_URL =
  'https://ai-gateway.vercel.sh/v1/report' as const

/**
 * Logical query parameters: `.api` is sent to the gateway; `.aliases` are also
 * accepted by our admin proxy (camelCase).
 */
export const AiGatewayReportQueryParam = {
  startDate: { api: 'start_date', aliases: ['startDate'] as const },
  endDate: { api: 'end_date', aliases: ['endDate'] as const },
  groupBy: { api: 'group_by', aliases: ['groupBy'] as const },
  datePart: { api: 'date_part', aliases: ['datePart'] as const },
  userId: { api: 'user_id', aliases: ['userId'] as const },
  model: { api: 'model', aliases: [] as const },
  tags: { api: 'tags', aliases: [] as const },
  credentialType: { api: 'credential_type', aliases: [] as const },
  provider: { api: 'provider', aliases: [] as const },
} as const

export type AiGatewayReportQueryParamName = keyof typeof AiGatewayReportQueryParam

/** Read from URLSearchParams: official API key first, then admin aliases. */
export function readAiGatewayReportQueryParam(
  sp: URLSearchParams,
  name: AiGatewayReportQueryParamName
): string | null {
  const def = AiGatewayReportQueryParam[name]
  const primary = sp.get(def.api)
  if (primary != null && primary !== '') return primary
  for (const key of def.aliases) {
    const v = sp.get(key)
    if (v != null && v !== '') return v
  }
  return null
}

export const AI_GATEWAY_REPORT_GROUP_BY_VALUES = [
  'model',
  'user',
  'tag',
  'provider',
  'credential_type',
] as const

export type AiGatewayReportGroupBy =
  (typeof AI_GATEWAY_REPORT_GROUP_BY_VALUES)[number]

export function parseAiGatewayReportGroupBy(
  raw: string | null | undefined
): AiGatewayReportGroupBy | undefined {
  if (!raw) return undefined
  return (AI_GATEWAY_REPORT_GROUP_BY_VALUES as readonly string[]).includes(raw)
    ? (raw as AiGatewayReportGroupBy)
    : undefined
}

export const AI_GATEWAY_REPORT_DATE_PART_VALUES = ['hour', 'day'] as const

export type AiGatewayReportDatePart =
  (typeof AI_GATEWAY_REPORT_DATE_PART_VALUES)[number]

export function parseAiGatewayReportDatePart(
  raw: string | null | undefined
): AiGatewayReportDatePart | undefined {
  if (!raw) return undefined
  return (AI_GATEWAY_REPORT_DATE_PART_VALUES as readonly string[]).includes(raw)
    ? (raw as AiGatewayReportDatePart)
    : undefined
}

export const AI_GATEWAY_CREDENTIAL_TYPE_VALUES = ['byok', 'system'] as const

export type AiGatewayCredentialType =
  (typeof AI_GATEWAY_CREDENTIAL_TYPE_VALUES)[number]

export function parseAiGatewayCredentialType(
  raw: string | null | undefined
): AiGatewayCredentialType | undefined {
  if (!raw) return undefined
  return (AI_GATEWAY_CREDENTIAL_TYPE_VALUES as readonly string[]).includes(raw)
    ? (raw as AiGatewayCredentialType)
    : undefined
}

/** Human-readable requirement text for validation errors. */
export function aiGatewayReportRequiredRangeMessage(): string {
  const { startDate, endDate } = AiGatewayReportQueryParam
  return `${startDate.api} and ${endDate.api} are required (YYYY-MM-DD)`
}
