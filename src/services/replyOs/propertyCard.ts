import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { PROPERTY_KIND } from '@convex/constants'
import type { ClassificationExtracted, PropertyCard, PropertyKind } from './types'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length > 0) return `+${digits}`
  return phone.trim()
}

export function phoneVariants(phone: string): string[] {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')
  const variants = new Set<string>()
  if (trimmed) variants.add(trimmed)
  if (digits) {
    variants.add(digits)
    variants.add(`+${digits}`)
  }
  if (digits.length === 10) {
    variants.add(`+1${digits}`)
    variants.add(`1${digits}`)
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    variants.add(`+${digits}`)
    variants.add(digits.slice(1))
  }
  const normalized = normalizePhone(trimmed)
  if (normalized) variants.add(normalized)
  return [...variants]
}

export function formatPropertyCard(property: PropertyCard): string {
  const lines: string[] = [`Kind: ${property.kind}`]
  const address = [property.addressLine, property.city, property.state, property.zip]
    .filter(Boolean)
    .join(', ')
  if (address) lines.push(`Address: ${address}`)
  if (property.county) lines.push(`County: ${property.county}`)
  if (property.apn) lines.push(`APN: ${property.apn}`)
  if (property.acres !== undefined) lines.push(`Acres: ${property.acres}`)
  if (property.beds !== undefined) lines.push(`Beds: ${property.beds}`)
  if (property.baths !== undefined) lines.push(`Baths: ${property.baths}`)
  if (property.lastOfferAmount !== undefined) {
    const when =
      property.lastOfferAt !== undefined
        ? ` on ${new Date(property.lastOfferAt).toISOString().slice(0, 10)}`
        : ''
    lines.push(`Last offer: ${property.lastOfferAmount}${when}`)
  }
  if (property.notes) lines.push(`Notes: ${property.notes}`)
  return lines.join('\n')
}

function deriveKind(args: {
  extracted: ClassificationExtracted
  nicheId?: string
  existingKind?: PropertyKind
}): PropertyKind {
  if (args.existingKind) return args.existingKind
  if (args.extracted.acreageConfirmed) return PROPERTY_KIND.LAND
  if (args.nicheId === 'real_estate') return PROPERTY_KIND.LAND
  return PROPERTY_KIND.HOUSE
}

async function findProspectByPhone(
  tenantId: Id<'tenants'>,
  phone: string
): Promise<{ _id: Id<'prospects'> } | null> {
  for (const variant of phoneVariants(phone)) {
    const found = await convex.query(api.prospects.findByPhone, {
      tenantId,
      phone: variant,
    })
    if (found) return found
  }
  return null
}

export async function resolvePropertyForThread(args: {
  tenantId: Id<'tenants'>
  thread: Pick<Doc<'inboxThreads'>, 'prospectId' | 'externalThreadId' | 'participantEmails'>
  extracted: ClassificationExtracted
}): Promise<Doc<'properties'>> {
  const config = await convex.query(api.tenantConfigs.getByTenantId, {
    tenantId: args.tenantId,
  })
  const nicheId = config?.nicheId

  let prospectId = args.thread.prospectId
  if (!prospectId) {
    const phone =
      args.thread.externalThreadId ||
      args.thread.participantEmails.find((entry) => /\d/.test(entry)) ||
      ''
    if (phone) {
      const prospect = await findProspectByPhone(args.tenantId, phone)
      prospectId = prospect?._id
    }
  }

  if (prospectId) {
    const existing = await convex.query(api.properties.getByProspect, {
      prospectId,
    })
    if (existing && existing.tenantId === args.tenantId) return existing
  }

  const kind = deriveKind({ extracted: args.extracted, nicheId })
  const propertyId = await convex.mutation(api.properties.upsertForProspect, {
    tenantId: args.tenantId,
    prospectId,
    kind,
  })
  const created = await convex.query(api.properties.getById, { propertyId })
  if (!created) {
    throw new Error('Failed to create property card')
  }
  return created
}
