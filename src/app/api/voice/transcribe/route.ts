import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { config } from '@/lib/config'
import { createVoice } from '@/mastra/voice'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    if (!config.openai.apiKey) {
      return NextResponse.json(
        {
          text: '',
          error: 'Voice transcription is not configured. Add OPENAI_API_KEY to your environment variables.',
        },
        { status: 200 }
      )
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const readable = Readable.from(Buffer.from(arrayBuffer))

    const voice = createVoice()
    const transcript = await voice.listen(readable, { filetype: 'webm' })

    return NextResponse.json({ text: transcript ?? '' })
  } catch (error) {
    console.error('[Voice] Transcribe error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
