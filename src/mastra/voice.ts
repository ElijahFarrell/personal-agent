import { OpenAIVoice } from '@mastra/voice-openai'
import { config } from '@/lib/config'

/**
 * Shared OpenAI voice instance — Whisper for STT, tts-1 for TTS.
 * Reused by the transcription API route and any agent with voice attached.
 */
export function createVoice(): OpenAIVoice {
  return new OpenAIVoice({
    listeningModel: {
      name: 'whisper-1',
      apiKey: config.openai.apiKey,
    },
    speechModel: {
      name: 'tts-1',
      apiKey: config.openai.apiKey,
    },
    speaker: 'alloy',
  })
}
