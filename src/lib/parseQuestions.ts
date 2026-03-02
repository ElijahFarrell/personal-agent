export interface QuestionOption {
  id: string
  label: string
}

export interface QuestionBlock {
  id: string
  prompt: string
  multiple: boolean
  options: QuestionOption[]
}

export interface QuestionParseResult {
  /** Alternating string (markdown) and QuestionBlock segments */
  segments: Array<string | QuestionBlock>
  questions: QuestionBlock[]
}

const QUESTION_BLOCK_RE =
  /:::question\{([^}]+)\}\s*\n([\s\S]*?):::/g

const OPTION_RE = /::option\{([^}]+)\}/g

function parseJsonAttrs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(`{${raw}}`)
  } catch {
    const result: Record<string, unknown> = {}
    const strMatch = raw.matchAll(/"(\w+)"\s*:\s*"([^"]*)"/g)
    for (const m of strMatch) result[m[1]] = m[2]
    const boolMatch = raw.matchAll(/"(\w+)"\s*:\s*(true|false)/g)
    for (const m of boolMatch) result[m[1]] = m[2] === 'true'
    return result
  }
}

/**
 * Parses :::question blocks from markdown content.
 * Returns segments (alternating text and QuestionBlock) and a flat list of all questions.
 */
export function parseQuestions(content: string): QuestionParseResult {
  const questions: QuestionBlock[] = []
  const segments: Array<string | QuestionBlock> = []

  let lastIndex = 0
  const re = new RegExp(QUESTION_BLOCK_RE.source, 'g')
  let match: RegExpExecArray | null

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push(content.slice(lastIndex, match.index))
    }

    const attrs = parseJsonAttrs(match[1])
    const inner = match[2]

    const options: QuestionOption[] = []
    const optRe = new RegExp(OPTION_RE.source, 'g')
    let optMatch: RegExpExecArray | null
    while ((optMatch = optRe.exec(inner)) !== null) {
      const optAttrs = parseJsonAttrs(optMatch[1])
      if (optAttrs.id && optAttrs.label) {
        options.push({ id: String(optAttrs.id), label: String(optAttrs.label) })
      }
    }

    const question: QuestionBlock = {
      id: String(attrs.id ?? `q-${questions.length}`),
      prompt: String(attrs.prompt ?? ''),
      multiple: Boolean(attrs.multiple),
      options,
    }

    questions.push(question)
    segments.push(question)

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push(content.slice(lastIndex))
  }

  if (segments.length === 0) {
    segments.push(content)
  }

  return { segments, questions }
}
