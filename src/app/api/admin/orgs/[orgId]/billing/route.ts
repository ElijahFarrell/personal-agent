import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { assertSuperAdmin } from '@/middleware/adminGuard'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId } = await auth()
    assertSuperAdmin(userId)

    const { orgId } = await params
    const billing = await convex.query(api.billing.getBillingByTenantId, {
      tenantId: orgId as Id<'tenants'>,
    })

    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    return NextResponse.json(billing)
  } catch (err) {
    if (err instanceof Response) throw err
    console.error('[Admin Billing GET]', err)
    return NextResponse.json(
      { error: 'Failed to get billing' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId } = await auth()
    assertSuperAdmin(userId)

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      )
    }

    const { orgId } = await params
    const body = await req.json()
    const {
      billingEmail,
      priceId,
      trialDays,
      creditsAmount,
    } = body as {
      billingEmail?: string
      priceId: string
      trialDays?: number
      creditsAmount?: number
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'priceId is required' },
        { status: 400 }
      )
    }

    const tenant = await convex.query(api.tenants.getTenantById, {
      tenantId: orgId as Id<'tenants'>,
    })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const billing = await convex.query(api.billing.getBillingByTenantId, {
      tenantId: orgId as Id<'tenants'>,
    })
    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    const customer = await stripe.customers.create({
      name: tenant.name,
      email: billingEmail ?? undefined,
      metadata: { tenantId: orgId, clerkOrgId: tenant.clerkOrgId },
    })

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      trial_period_days: trialDays ?? undefined,
      metadata: { tenantId: orgId },
    })

    const sub = subscription as unknown as {
      id: string
      status: string
      current_period_end?: number
      items?: { data?: Array<{ price?: { unit_amount?: number; recurring?: { interval?: string } } }> }
    }
    const currentPeriodEnd = (sub.current_period_end ?? 0) * 1000
    const firstItem = sub.items?.data?.[0]
    const credits =
      creditsAmount ??
      ((firstItem?.price as { recurring?: { interval?: string } })?.recurring?.interval === 'month'
        ? 1000
        : 100)

    await convex.mutation(api.billing.setStripeIds, {
      tenantId: orgId as Id<'tenants'>,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: 'trialing',
      currentPeriodEnd,
      monthlyBasePrice: (firstItem?.price as { unit_amount?: number })?.unit_amount ?? undefined,
    })

    return NextResponse.json({
      customerId: customer.id,
      subscriptionId: sub.id,
      status: sub.status,
    })
  } catch (err) {
    if (err instanceof Response) throw err
    console.error('[Admin Billing POST]', err)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId } = await auth()
    assertSuperAdmin(userId)

    const { orgId } = await params
    const body = await req.json()
    const { trialEndsAt, credits, extendTrialDays } = body as {
      trialEndsAt?: number
      credits?: number
      extendTrialDays?: number
    }

    const billing = await convex.query(api.billing.getBillingByTenantId, {
      tenantId: orgId as Id<'tenants'>,
    })
    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    if (extendTrialDays && billing.trialEndsAt) {
      await convex.mutation(api.billing.extendTrial, {
        tenantId: orgId as Id<'tenants'>,
        additionalDays: extendTrialDays,
      })
    }

    if (credits !== undefined && credits > 0) {
      await convex.mutation(api.credits.addCredits, {
        tenantId: orgId as Id<'tenants'>,
        amount: credits,
        action: 'admin_grant',
        description: 'Admin credit grant',
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Response) throw err
    console.error('[Admin Billing PATCH]', err)
    return NextResponse.json(
      { error: 'Failed to update billing' },
      { status: 500 }
    )
  }
}
