import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateText } from 'ai'
import { Models } from '@/constants/models'
import { gatewayReportingProviderOptions } from '@/lib/aiGatewayReporting'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = typeof body?.message === 'string' ? body.message.trim() : null

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const { userId } = await auth()
    const reportUser = userId ?? 'anonymous'
    const { text } = await generateText({
      model: Models.GPT_4O_MINI(),
      system:
        "Summarize the user's message into a concise chat thread title (3-6 words). Return only the title, no quotes or punctuation.",
      prompt: message,
      ...gatewayReportingProviderOptions({
        user: reportUser,
        tags: ['surface:thread-title'],
      }),
    })

    const title = text?.trim() || message.slice(0, 50)
    return NextResponse.json({ title })
  } catch (err) {
    console.error('[Thread summarize]', err)
    return NextResponse.json(
      { error: 'Failed to summarize' },
      { status: 500 }
    )
  }
}
