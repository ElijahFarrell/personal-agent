import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  listUnread,
  send,
  reply,
} from '@/services/gmailService'

/**
 * Creates a Gmail read tool scoped to a user.
 * Reads unread emails and returns a summary.
 */
export function createGmailReadTool(userId: string) {
  return createTool({
    id: 'gmail-read',
    description:
      'Read unread emails from the user\'s inbox. Returns a summary of each ' +
      'email with subject, from, snippet, and date. Use this to check the inbox ' +
      'or summarize unread messages.',
    inputSchema: z.object({
      maxResults: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .describe('Maximum number of unread emails to fetch'),
    }),
    execute: async (input) => {
      try {
        const emails = await listUnread(userId, input.maxResults)
        const summary = emails.map((e) => ({
          id: e.id,
          subject: e.subject,
          from: e.from,
          snippet: e.snippet,
          date: e.date,
          threadId: e.threadId,
        }))
        return {
          emails: summary,
          count: summary.length,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { emails: [], count: 0, error: message }
      }
    },
  })
}

/**
 * Creates a Gmail send tool scoped to a user.
 * CRITICAL: Always show the draft first and only call after user confirms.
 */
export function createGmailSendTool(userId: string) {
  return createTool({
    id: 'gmail-send',
    description:
      'Send an email. CRITICAL: Always show the full draft to the user first ' +
      'and ask "Shall I send this?" — only call this tool after the user gives ' +
      'explicit confirmation. Never send without showing the draft and waiting ' +
      'for approval.',
    inputSchema: z.object({
      to: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject'),
      body: z.string().describe('Email body (plain text)'),
      replyToThreadId: z
        .string()
        .optional()
        .describe('Gmail thread ID if replying to an existing thread'),
    }),
    execute: async (input) => {
      try {
        const messageId = await send(userId, {
          to: input.to,
          subject: input.subject,
          body: input.body,
          replyToThreadId: input.replyToThreadId,
        })
        return { success: true, messageId }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: message }
      }
    },
  })
}

/**
 * Creates a Gmail reply tool scoped to a user.
 * Replies to an existing email thread.
 */
export function createGmailReplyTool(userId: string) {
  return createTool({
    id: 'gmail-reply',
    description:
      'Reply to an existing email thread. Use the thread ID from a previous ' +
      'gmail-read result. CRITICAL: Show the draft reply to the user first ' +
      'and only send after explicit confirmation.',
    inputSchema: z.object({
      threadId: z.string().describe('Gmail thread ID to reply to'),
      body: z.string().describe('Reply body text'),
    }),
    execute: async (input) => {
      try {
        const messageId = await reply(userId, input.threadId, input.body)
        return { success: true, messageId }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: message }
      }
    },
  })
}
