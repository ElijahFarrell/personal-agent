/**
 * Vercel AI Gateway Custom Reporting — attach stable user + bounded tags per request.
 * @see https://vercel.com/docs/ai-gateway/capabilities/custom-reporting
 */

import {
  AI_GATEWAY_REPORT_BASE_URL,
  AiGatewayReportQueryParam,
  type AiGatewayCredentialType,
  type AiGatewayReportDatePart,
  type AiGatewayReportGroupBy,
} from '@/constants/aiGatewayReportingApi'

export type {
  AiGatewayCredentialType,
  AiGatewayReportDatePart,
  AiGatewayReportGroupBy,
} from '@/constants/aiGatewayReportingApi'

export type GatewayReportingContext = {
  /** Stable id for cost attribution (e.g. Clerk userId) */
  user: string
  /** Low-cardinality tags only (feature, surface, tenant slug/id) */
  tags?: string[]
}

export function gatewayReportingProviderOptions(
  ctx: GatewayReportingContext
): { providerOptions: { gateway: { user: string; tags?: string[] } } } {
  const tags = [...new Set((ctx.tags ?? []).filter(Boolean))]
  return {
    providerOptions: {
      gateway: {
        user: ctx.user,
        ...(tags.length > 0 ? { tags } : {}),
      },
    },
  }
}

type StreamOpts = Record<string, unknown> & {
  providerOptions?: Record<string, unknown>
}

/**
 * Deep-merge `providerOptions.gateway` into Mastra `agent.stream` options
 * without dropping existing provider keys (e.g. openai.parallelToolCalls).
 */
export function mergeAgentStreamOptionsWithGatewayReporting<T extends StreamOpts>(
  base: T,
  ctx: GatewayReportingContext
): T {
  const basePo = base.providerOptions ?? {}
  const prevGw =
    basePo.gateway && typeof basePo.gateway === 'object' && !Array.isArray(basePo.gateway)
      ? { ...(basePo.gateway as Record<string, unknown>) }
      : {}

  const prevTags = Array.isArray(prevGw.tags)
    ? (prevGw.tags as string[]).filter((t): t is string => typeof t === 'string')
    : []
  const nextTags = [...new Set([...prevTags, ...(ctx.tags ?? []).filter(Boolean)])]

  return {
    ...base,
    providerOptions: {
      ...basePo,
      gateway: {
        ...prevGw,
        user: ctx.user,
        ...(nextTags.length > 0 ? { tags: nextTags } : {}),
      },
    },
  }
}

export function chatGatewayReportingContext(params: {
  clerkUserId: string
  tenantId: string
  /** e.g. agent:orchestrator, agent:email, flow:deep-research */
  flowTag: string
}): GatewayReportingContext {
  return {
    user: params.clerkUserId,
    tags: ['surface:chat', `tenant:${params.tenantId}`, params.flowTag],
  }
}

export type FetchAiGatewayReportParams = {
  startDate: string
  endDate: string
  groupBy?: AiGatewayReportGroupBy
  datePart?: AiGatewayReportDatePart
  userId?: string
  model?: string
  tags?: string
  credentialType?: AiGatewayCredentialType
  provider?: string
}

export type AiGatewayReportRow = {
  day?: string
  hour?: string
  model?: string
  provider?: string
  user?: string
  tag?: string
  total_cost?: number
  market_cost?: number
  input_tokens?: number
  output_tokens?: number
  cached_input_tokens?: number
  cache_creation_input_tokens?: number
  reasoning_tokens?: number
  request_count?: number
}

export type AiGatewayReportResponse = { results: AiGatewayReportRow[] }

/**
 * Server-only: query Custom Reporting API. Requires AI_GATEWAY_API_KEY (Bearer).
 */
export async function fetchAiGatewayUsageReport(
  params: FetchAiGatewayReportParams
): Promise<AiGatewayReportResponse> {
  const key = process.env.AI_GATEWAY_API_KEY
  if (!key?.trim()) {
    throw new Error('AI_GATEWAY_API_KEY is not set')
  }

  const Q = AiGatewayReportQueryParam
  const search = new URLSearchParams({
    [Q.startDate.api]: params.startDate,
    [Q.endDate.api]: params.endDate,
  })
  if (params.groupBy) search.set(Q.groupBy.api, params.groupBy)
  if (params.datePart) search.set(Q.datePart.api, params.datePart)
  if (params.userId) search.set(Q.userId.api, params.userId)
  if (params.model) search.set(Q.model.api, params.model)
  if (params.tags) search.set(Q.tags.api, params.tags)
  if (params.credentialType) {
    search.set(Q.credentialType.api, params.credentialType)
  }
  if (params.provider) search.set(Q.provider.api, params.provider)

  const url = `${AI_GATEWAY_REPORT_BASE_URL}?${search.toString()}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key.trim()}` },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`AI Gateway report failed: ${res.status} ${body.slice(0, 500)}`)
  }

  return (await res.json()) as AiGatewayReportResponse
}
