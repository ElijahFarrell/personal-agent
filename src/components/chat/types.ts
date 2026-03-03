/** Unified message shape used across all chat components */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  source: 'web' | 'telegram'
  createdAt: number
  /** Route target for assistant messages (e.g. 'email', 'research') */
  route?: string
  /** Whether this message is still streaming */
  isStreaming?: boolean
  /** AI SDK message parts for rich rendering (tool calls, etc.) */
  parts?: Array<{
    type: string
    text?: string
    toolInvocation?: {
      toolName: string
      state: string
      args?: Record<string, unknown>
      result?: unknown
    }
    [key: string]: unknown
  }>
}
