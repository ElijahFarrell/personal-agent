import { Agent } from '@mastra/core/agent'
import { REPLY_TAG } from '@convex/constants'
import { AgentModels } from '@/constants/models'
import { SellerReplyClassificationSchema } from '@/mastra/agents/schemas'
import { SELLER_REPLY_CLASSIFY_PROMPT } from '@/mastra/prompts/sellerReplyClassify'
import type { ClassificationExtracted, ClassificationResult, PropertyKind, ReplyTag } from './types'

export interface RuleClassification {
  tag: ReplyTag
  confidence: number
  reason: string
  decisive: boolean
  extracted: ClassificationExtracted
}

const OPT_OUT_RE =
  /\b(stop|unsubscribe|opt[\s-]?out|remove me|end texts?|quit|cancel)\b/i
const WRONG_OWNER_RE = /\b(wrong number|not the owner|not the property owner|don't own|do not own)\b/i
const DEAL_RE = /\b(contract|title|closing|wire|access)\b/i
const HUMAN_NOW_RE =
  /\b(call me|give me a call|can you call|how much|make me an offer|make an offer)\b|\byes\b/i
const LATER_RE = /\b(maybe later|next year|not right now|not now|in a few months)\b/i
const PRICE_RE = /\$\s*([\d,]+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*k\b/i
const ACRES_RE = /\b(\d+(?:\.\d+)?)\s*acres?\b/i

function extractPrice(transcript: string): number | undefined {
  const match = transcript.match(PRICE_RE)
  if (!match) return undefined
  if (match[1]) {
    const n = Number(match[1].replace(/,/g, ''))
    return Number.isFinite(n) ? n : undefined
  }
  if (match[2]) {
    const n = Number(match[2]) * 1000
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function extractFromTranscript(transcript: string): ClassificationExtracted {
  const askingPrice = extractPrice(transcript)
  const wantsCall = /\b(call me|give me a call|can you call)\b/i.test(transcript)
  const acreageConfirmed = ACRES_RE.test(transcript)
  const timelineMatch = transcript.match(
    /\b(next year|next month|in the spring|in the fall|in a few months|not right now)\b/i
  )
  return {
    askingPrice,
    wantsCall: wantsCall || undefined,
    acreageConfirmed: acreageConfirmed || undefined,
    timeline: timelineMatch?.[1],
  }
}

export function applyClassificationRules(transcript: string): RuleClassification {
  const text = transcript.trim()
  const extracted = extractFromTranscript(text)

  if (OPT_OUT_RE.test(text)) {
    return {
      tag: REPLY_TAG.IGNORE,
      confidence: 1,
      reason: 'Seller used opt-out language.',
      decisive: true,
      extracted,
    }
  }

  if (WRONG_OWNER_RE.test(text)) {
    return {
      tag: REPLY_TAG.IGNORE,
      confidence: 0.95,
      reason: 'Wrong number or not the owner.',
      decisive: true,
      extracted,
    }
  }

  if (DEAL_RE.test(text)) {
    return {
      tag: REPLY_TAG.DEAL,
      confidence: 0.85,
      reason: 'Contract, title, closing, wire, or access language.',
      decisive: false,
      extracted,
    }
  }

  if (HUMAN_NOW_RE.test(text) || extracted.askingPrice !== undefined) {
    return {
      tag: REPLY_TAG.HUMAN_NOW,
      confidence: extracted.askingPrice !== undefined ? 0.86 : 0.8,
      reason: 'Live interest, price, or a request to talk.',
      decisive: false,
      extracted,
    }
  }

  if (LATER_RE.test(text)) {
    return {
      tag: REPLY_TAG.LATER,
      confidence: 0.82,
      reason: 'Seller asked to wait.',
      decisive: false,
      extracted,
    }
  }

  return {
    tag: REPLY_TAG.HUMAN_NOW,
    confidence: 0.4,
    reason: 'No decisive rule matched.',
    decisive: false,
    extracted,
  }
}

function createClassifierAgent(): Agent {
  return new Agent({
    id: 'seller-reply-classifier',
    name: 'sellerReplyClassifier',
    instructions: SELLER_REPLY_CLASSIFY_PROMPT,
    model: AgentModels.messaging(),
  })
}

export async function classifySellerReply(args: {
  transcript: string
  propertyCard: string
  kind: PropertyKind
}): Promise<ClassificationResult> {
  const rules = applyClassificationRules(args.transcript)
  if (rules.decisive) {
    return {
      tag: rules.tag,
      confidence: rules.confidence,
      reason: rules.reason,
      extracted: rules.extracted,
      model: 'rules',
    }
  }

  try {
    const agent = createClassifierAgent()
    const prompt = [
      `Property kind: ${args.kind}`,
      args.propertyCard ? `Property card:\n${args.propertyCard}` : 'Property card: (none)',
      '',
      'Transcript (oldest → newest):',
      args.transcript,
    ].join('\n')

    const result = await agent.generate(prompt, {
      structuredOutput: { schema: SellerReplyClassificationSchema },
    })
    const parsed = SellerReplyClassificationSchema.safeParse(result.object)
    if (!parsed.success) {
      return { ...rules, model: 'rules' }
    }
    return {
      tag: parsed.data.tag,
      confidence: parsed.data.confidence,
      reason: parsed.data.reason,
      extracted: parsed.data.extracted,
      model: 'messaging',
    }
  } catch {
    return { ...rules, model: 'rules' }
  }
}
