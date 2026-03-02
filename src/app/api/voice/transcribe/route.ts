import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const apiKey = config.wisprFlow.apiKey

    if (!apiKey) {
      return NextResponse.json(
        {
          text: '',
          error: 'Voice transcription is not configured. Add WISPR_FLOW_API_KEY to your environment variables.',
        },
        { status: 200 }
      )
    }

    // Convert audio blob to base64 for WisprFlow REST API
    const arrayBuffer = await audioFile.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')

    const response = await fetch('https://api.wisprflow.ai/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        audio: base64Audio,
        language: 'en',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[Voice] WisprFlow error:', err)
      return NextResponse.json(
        { text: '', error: 'Transcription failed' },
        { status: 500 }
      )
    }

    const data = await response.json()

    return NextResponse.json({ text: data.text ?? '' })
  } catch (error) {
    console.error('[Voice] Transcribe error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
