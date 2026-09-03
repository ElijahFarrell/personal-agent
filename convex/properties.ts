import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, PROPERTY_KIND, TABLES } from './constants'

const kindValidator = v.union(
  v.literal(PROPERTY_KIND.LAND),
  v.literal(PROPERTY_KIND.HOUSE)
)

const propertyDocValidator = v.object({
  _id: v.id(TABLES.PROPERTIES),
  _creationTime: v.number(),
  tenantId: v.id(TABLES.TENANTS),
  prospectId: v.optional(v.id(TABLES.PROSPECTS)),
  kind: kindValidator,
  addressLine: v.optional(v.string()),
  city: v.optional(v.string()),
  state: v.optional(v.string()),
  zip: v.optional(v.string()),
  county: v.optional(v.string()),
  apn: v.optional(v.string()),
  acres: v.optional(v.number()),
  beds: v.optional(v.number()),
  baths: v.optional(v.number()),
  lastOfferAmount: v.optional(v.number()),
  lastOfferAt: v.optional(v.number()),
  lastMailerAt: v.optional(v.number()),
  notes: v.optional(v.string()),
  customFields: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

const propertyFields = {
  prospectId: v.optional(v.id(TABLES.PROSPECTS)),
  kind: kindValidator,
  addressLine: v.optional(v.string()),
  city: v.optional(v.string()),
  state: v.optional(v.string()),
  zip: v.optional(v.string()),
  county: v.optional(v.string()),
  apn: v.optional(v.string()),
  acres: v.optional(v.number()),
  beds: v.optional(v.number()),
  baths: v.optional(v.number()),
  lastOfferAmount: v.optional(v.number()),
  lastOfferAt: v.optional(v.number()),
  lastMailerAt: v.optional(v.number()),
  notes: v.optional(v.string()),
  customFields: v.optional(v.any()),
}

export const upsertForProspect = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    ...propertyFields,
  },
  returns: v.id(TABLES.PROPERTIES),
  handler: async (ctx, args) => {
    const now = Date.now()
    if (args.prospectId) {
      const existing = await ctx.db
        .query(TABLES.PROPERTIES)
        .withIndex(INDEXES.BY_PROSPECT_ID, (q) =>
          q.eq('prospectId', args.prospectId)
        )
        .first()
      if (existing && existing.tenantId === args.tenantId) {
        await ctx.db.patch(existing._id, {
          kind: args.kind,
          addressLine: args.addressLine,
          city: args.city,
          state: args.state,
          zip: args.zip,
          county: args.county,
          apn: args.apn,
          acres: args.acres,
          beds: args.beds,
          baths: args.baths,
          lastOfferAmount: args.lastOfferAmount,
          lastOfferAt: args.lastOfferAt,
          lastMailerAt: args.lastMailerAt,
          notes: args.notes,
          customFields: args.customFields,
          updatedAt: now,
        })
        return existing._id
      }
    }

    return await ctx.db.insert(TABLES.PROPERTIES, {
      tenantId: args.tenantId,
      prospectId: args.prospectId,
      kind: args.kind,
      addressLine: args.addressLine,
      city: args.city,
      state: args.state,
      zip: args.zip,
      county: args.county,
      apn: args.apn,
      acres: args.acres,
      beds: args.beds,
      baths: args.baths,
      lastOfferAmount: args.lastOfferAmount,
      lastOfferAt: args.lastOfferAt,
      lastMailerAt: args.lastMailerAt,
      notes: args.notes,
      customFields: args.customFields,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const getById = query({
  args: { propertyId: v.id(TABLES.PROPERTIES) },
  returns: v.union(propertyDocValidator, v.null()),
  handler: async (ctx, { propertyId }) => {
    return await ctx.db.get(propertyId)
  },
})

export const listForTenant = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    limit: v.optional(v.number()),
  },
  returns: v.array(propertyDocValidator),
  handler: async (ctx, { tenantId, limit = 100 }) => {
    return await ctx.db
      .query(TABLES.PROPERTIES)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .take(limit)
  },
})
