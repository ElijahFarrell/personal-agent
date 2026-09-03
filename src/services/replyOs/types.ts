import type { Id } from '@convex/_generated/dataModel'
import type { PROPERTY_KIND, REPLY_ADAPTER, REPLY_TAG } from '@convex/constants'

export type ReplyTag = (typeof REPLY_TAG)[keyof typeof REPLY_TAG]
export type PropertyKind = (typeof PROPERTY_KIND)[keyof typeof PROPERTY_KIND]
export type ReplyAdapterName = (typeof REPLY_ADAPTER)[keyof typeof REPLY_ADAPTER]

export interface InboundReplyEvent {
  tenantId: Id<'tenants'>
  userId: Id<'users'>
  provider: 'sms' | 'smarter_contact'
  externalThreadId: string
  externalMessageId: string
  fromPhone: string
  toPhone?: string
  body: string
  receivedAt: number
  raw?: unknown
}

export interface ClassificationExtracted {
  askingPrice?: number
  timeline?: string
  motivation?: string
  wantsCall?: boolean
  acreageConfirmed?: boolean
  notes?: string
}

export interface ClassificationResult {
  tag: ReplyTag
  confidence: number
  reason: string
  extracted: ClassificationExtracted
  model: string
}

export interface PropertyCard {
  kind: PropertyKind
  addressLine?: string
  city?: string
  state?: string
  zip?: string
  county?: string
  apn?: string
  acres?: number
  beds?: number
  baths?: number
  lastOfferAmount?: number
  lastOfferAt?: number
  notes?: string
}

export interface ReplyAdapter {
  name: ReplyAdapterName
  poll(args: {
    tenantId: Id<'tenants'>
    userId: Id<'users'>
  }): Promise<{ threadsSeen: number; newMessages: number }>
}
