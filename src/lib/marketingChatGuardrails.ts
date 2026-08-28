/**
 * Input/output guardrails for the marketing chatbot.
 * Defense-in-depth — the system prompt is the primary defense,
 * these catch obvious abuse before/after generation.
 */

const MAX_MESSAGE_LENGTH = 500
const MAX_CONVERSATION_MESSAGES = 20

const JAILBREAK_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompts?|rules?)/i,
  /forget\s+(your|all|previous)\s+(instructions|rules?|prompts?)/i,
  /you\s+are\s+now\s+(a|an|the)\b/i,
  /pretend\s+(to\s+be|you\s+are|you're)/i,
  /act\s+as\s+(a|an|if|though)\b/i,
  /new\s+system\s+prompt/i,
  /override\s+(your|the|system)\s+(instructions|prompt|rules)/i,
  /\bDAN\b.*\bjailbreak\b/i,
  /do\s+anything\s+now/i,
  /reveal\s+(your|the|system)\s+(prompt|instructions)/i,
  /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions)/i,
  /repeat\s+(your|the)\s+(system|initial)\s+(prompt|instructions|message)/i,
  /developer\s+mode/i,
  /sudo\s+mode/i,
]

export interface GuardrailResult {
  allowed: boolean
  reason?: string
}

export function validateInput(
  message: string,
  conversationLength: number
): GuardrailResult {
  if (!message.trim()) {
    return { allowed: false, reason: 'Empty message.' }
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      allowed: false,
      reason: `Message too long. Please keep messages under ${MAX_MESSAGE_LENGTH} characters.`,
    }
  }

  if (conversationLength >= MAX_CONVERSATION_MESSAGES) {
    return {
      allowed: false,
      reason:
        'Conversation limit reached. Please start a new chat or reach out to our team directly.',
    }
  }

  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(message)) {
      return {
        allowed: false,
        reason:
          "I'm the Shiloh website assistant. I can help you learn about our platform or connect you with our team. What would you like to know?",
      }
    }
  }

  return { allowed: true }
}

const OUTPUT_FLAG_PATTERNS = [
  /\$\d+\/mo(?:nth)?\b/i,
  /\bfree\s+trial\b/i,
  /\bguarantee\b/i,
  /\bdiscount\b/i,
  /\bspecial\s+offer\b/i,
  /\bpromo(?:tion)?\s+code\b/i,
]

export function validateOutput(response: string): GuardrailResult {
  for (const pattern of OUTPUT_FLAG_PATTERNS) {
    if (pattern.test(response)) {
      return {
        allowed: true,
        reason: `Output flagged for review: matched ${pattern.source}`,
      }
    }
  }

  return { allowed: true }
}
