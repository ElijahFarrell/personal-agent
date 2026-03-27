import { NextRequest, NextResponse } from 'next/server'

/**
 * Optional Composio trigger target for near-real-time inbox (e.g. WhatsApp inbound).
 * Configure a separate trigger in Composio pointing to this URL.
 * Payload shapes vary by toolkit; extend normalization when you wire a specific trigger.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.COMPOSIO_INBOX_WEBHOOK_SECRET ?? process.env.COMPOSIO_WEBHOOK_SECRET
  const sig = req.headers.get('x-composio-signature') ?? req.headers.get('x-webhook-signature')
  if (secret && sig !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const raw = await req.text()
    let body: Record<string, unknown>
    try {
      body = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return NextResponse.json({ ok: true, ignored: true })
    }

    // TODO: map toolkit-specific payload → Convex inbox.upsertThread / insertMessage
    // using entity_id / connected account → Clerk user id.
    if (process.env.NODE_ENV === 'development') {
      console.info('[composio/inbox] received keys:', Object.keys(body))
    }

    return NextResponse.json({ ok: true, queued: false })
  } catch (e) {
    console.error('[composio/inbox]', e)
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }
}
