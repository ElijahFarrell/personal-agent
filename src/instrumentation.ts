import { registerOTel } from '@vercel/otel'
import { initLogger } from 'braintrust'

/**
 * Next.js instrumentation — runs once on Node server startup.
 * @see https://vercel.com/docs/tracing/instrumentation#initialize-otel
 */
export function register(): void {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return
  }

  registerOTel({ serviceName: process.env.OTEL_SERVICE_NAME?.trim() || 'ai-os' })

  const apiKey = process.env.BRAINTRUST_API_KEY?.trim()
  if (!apiKey) {
    return
  }

  const projectId = process.env.BRAINTRUST_PROJECT_ID?.trim()
  initLogger({
    apiKey,
    ...(projectId ? { projectId } : {}),
  })
}
