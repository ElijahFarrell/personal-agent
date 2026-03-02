/**
 * Mastra tools for browser automation.
 */
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  navigate,
  extractContent,
  fillAndSubmit,
} from '@/services/browserService'

const MAX_CONTENT_CHARS = 2000

/**
 * Navigate to a URL and return page title + first 2000 chars of content.
 */
export const browserNavigateTool = createTool({
  id: 'browser-navigate',
  description:
    'Navigate to a URL and return the page title and main text content. ' +
    'Use to read web pages, check websites, or gather information.',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to navigate to'),
  }),
  execute: async (input) => {
    const result = await navigate(input.url)
    if (!result.success) {
      return { success: false, error: result.error }
    }
    const content = (result.content ?? '').slice(0, MAX_CONTENT_CHARS)
    const truncated = (result.content ?? '').length > MAX_CONTENT_CHARS
    return {
      success: true,
      title: result.title,
      content,
      truncated: truncated ? `(first ${MAX_CONTENT_CHARS} chars)` : undefined,
    }
  },
})

/**
 * Extract specific content from a webpage.
 */
export const browserExtractTool = createTool({
  id: 'browser-extract',
  description:
    'Extract content from a webpage. Provide an instruction describing what to extract ' +
    '(e.g. "all job titles on this page"). Optionally use a CSS selector to narrow the area.',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to extract from'),
    selector: z
      .string()
      .optional()
      .describe('Optional CSS selector to extract only that element'),
    instruction: z
      .string()
      .describe(
        'What to extract in plain English (e.g. "all job titles on this page")'
      ),
  }),
  execute: async (input) => {
    const result = await extractContent(input.url, input.selector)
    if (!result.success) {
      return { success: false, error: result.error, instruction: input.instruction }
    }
    return {
      success: true,
      content: (result.content ?? '').slice(0, MAX_CONTENT_CHARS),
      title: result.title,
      instruction: input.instruction,
    }
  },
})

/**
 * Fill and submit a web form. Only use for authorized form submissions. Always confirm with user first.
 */
export const browserFillFormTool = createTool({
  id: 'browser-fill-form',
  description:
    'Fill and submit a web form. Only use for authorized form submissions. ' +
    'Always confirm with user first. Show what you are about to submit before executing.',
  inputSchema: z.object({
    url: z.string().url().describe('The URL of the form page'),
    fields: z
      .record(z.string())
      .describe('Form fields as key-value (field name -> value)'),
    submitSelector: z
      .string()
      .describe(
        'CSS selector for the submit button (e.g. "button[type=submit]" or "#submit")'
      ),
  }),
  execute: async (input) => {
    const result = await fillAndSubmit(input.url, input.fields, input.submitSelector)
    if (!result.success) {
      return { success: false, error: result.error }
    }
    return {
      success: true,
      content: (result.content ?? '').slice(0, MAX_CONTENT_CHARS),
      title: result.title,
    }
  },
})
