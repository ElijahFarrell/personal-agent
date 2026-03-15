/**
 * Stripe price IDs for billing plans. Set via env vars.
 * Create products/prices in Stripe Dashboard and add the IDs here.
 */

export const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID ?? '',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? '',
  exaWebsets: process.env.STRIPE_EXA_WEBSETS_PRICE_ID ?? '',
} as const

export type StripePriceIdKey = keyof typeof STRIPE_PRICE_IDS
