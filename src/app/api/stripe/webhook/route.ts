import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key)
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? '')
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

const DEFAULT_MONTHLY_CREDITS = 1000

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      )
    }

    const body = await req.text()
    const sig = req.headers.get('stripe-signature')

    if (!sig || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      )
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${message}` },
        { status: 400 }
      )
    }

    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id
        if (!customerId) break

        const billing = await convex.query(
          api.billing.getBillingByStripeCustomerId,
          { stripeCustomerId: customerId }
        )
        if (!billing) break

        const config = await convex.query(
          api.tenantConfigs.getByTenantId,
          { tenantId: billing.tenantId }
        )
        const credits =
          config?.limits.monthlyCredits ?? DEFAULT_MONTHLY_CREDITS

        await convex.mutation(api.billing.replenishCredits, {
          stripeCustomerId: customerId,
          creditsAmount: credits < 0 ? -1 : credits,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id
        if (!customerId) break

        await convex.mutation(api.billing.downgradeTenant, {
          stripeCustomerId: customerId,
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id
        if (!customerId) break

        await convex.mutation(api.billing.updateSubscriptionStatus, {
          stripeCustomerId: customerId,
          subscriptionStatus: 'past_due',
        })
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[Stripe Webhook]', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
