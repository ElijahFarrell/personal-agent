import { readFile } from 'fs/promises'
import { join } from 'path'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { REPLY_ADAPTER, REPLY_ADAPTER_RUN_STATUS } from '@convex/constants'
import { config } from '@/lib/config'
import { ingestInboundReply } from '../../ingest'
import {
  parseSmarterContactSnapshot,
  type SmarterContactSnapshot,
  type SmarterContactThread,
} from './parse'
import { SMARTER_CONTACT_SELECTORS as SEL } from './selectors'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const POLL_CAP = 20
const MESSENGER_URL = 'https://app.smartercontact.com/messenger'

async function getChromium() {
  try {
    const { chromium } = await import('playwright')
    return chromium
  } catch {
    throw new Error('Playwright is not installed. Run: npx playwright install chromium')
  }
}

async function collectSnapshot(page: {
  $$eval: (
    selector: string,
    pageFunction: (els: Element[], arg: typeof SEL) => SmarterContactThread[],
    arg: typeof SEL
  ) => Promise<SmarterContactThread[]>
}): Promise<SmarterContactSnapshot> {
  const threads = await page.$$eval(
    SEL.threadItem,
    (els, selectors) => {
      const unreadNeedle = selectors.unreadThread
      return els.slice(0, 20).map((el, index) => {
        const phone =
          el.getAttribute('data-phone') ||
          el.querySelector(selectors.threadPhone)?.textContent?.trim() ||
          ''
        const externalThreadId =
          el.getAttribute('data-thread-id') ||
          el.querySelector(selectors.threadId)?.getAttribute('data-thread-id') ||
          phone ||
          `sc-${index}`
        const snippet =
          el.querySelector(selectors.threadSnippet)?.textContent?.trim() || ''
        const unread =
          el.matches(unreadNeedle) ||
          Boolean(el.querySelector(unreadNeedle)) ||
          el.getAttribute('data-unread') === 'true'
        const messageNodes = Array.from(
          el.querySelectorAll(selectors.messageItem)
        )
        const messages = messageNodes.map((node, msgIndex) => {
          const id =
            node.getAttribute('data-message-id') ||
            `${externalThreadId}-${msgIndex}`
          const body =
            node.querySelector(selectors.messageBody)?.textContent?.trim() ||
            node.textContent?.trim() ||
            ''
          const sentRaw = node.getAttribute('data-sent-at')
          const sentAt = sentRaw ? Date.parse(sentRaw) || 0 : 0
          const isOutbound =
            node.getAttribute('data-outbound') === 'true' ||
            Boolean(node.querySelector(selectors.messageOutbound)) ||
            node.classList.contains('outbound')
          return { id, body, sentAt, isOutbound }
        })
        return { externalThreadId, phone, snippet, unread, messages }
      })
    },
    SEL
  )
  return { threads: threads.filter((t) => t.unread).slice(0, POLL_CAP) }
}

export async function runSmarterContactPoll(args: {
  tenantId: Id<'tenants'>
  userId: Id<'users'>
}): Promise<{
  skipped?: boolean
  reason?: string
  threadsSeen: number
  newMessages: number
}> {
  if (config.smarterContact.pollerEnabled !== 'true') {
    return { skipped: true, reason: 'disabled', threadsSeen: 0, newMessages: 0 }
  }

  const runId = await convex.mutation(api.replyAdapterRuns.start, {
    tenantId: args.tenantId,
    adapter: REPLY_ADAPTER.SMARTER_CONTACT_BROWSER,
  })

  let threadsSeen = 0
  let newMessages = 0
  try {
    const stateDir = config.smarterContact.storageStateDir
    const storageState = join(stateDir, `${args.tenantId}.json`)
    await readFile(storageState)

    const chromium = await getChromium()
    const apiKey = config.smarterContact.browserbaseApiKey
    const projectId = config.smarterContact.browserbaseProjectId

    const browser = apiKey
      ? await chromium.connectOverCDP(
          `wss://connect.browserbase.com?apiKey=${encodeURIComponent(apiKey)}${
            projectId ? `&projectId=${encodeURIComponent(projectId)}` : ''
          }`
        )
      : await chromium.launch({ headless: true })

    try {
      const context = apiKey
        ? browser.contexts()[0] ??
          (await browser.newContext({ storageState }))
        : await browser.newContext({ storageState })
      const page = context.pages()[0] ?? (await context.newPage())
      await page.goto(MESSENGER_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
      const snapshot = await collectSnapshot(page)
      threadsSeen = snapshot.threads.length
      const events = parseSmarterContactSnapshot(snapshot, {
        tenantId: args.tenantId,
        userId: args.userId,
      })
      for (const event of events) {
        await ingestInboundReply(event)
        newMessages += 1
      }
    } finally {
      await browser.close()
    }

    await convex.mutation(api.replyAdapterRuns.finish, {
      runId,
      status: REPLY_ADAPTER_RUN_STATUS.SUCCEEDED,
      threadsSeen,
      newMessages,
    })
    return { threadsSeen, newMessages }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Poll failed'
    await convex.mutation(api.replyAdapterRuns.finish, {
      runId,
      status: REPLY_ADAPTER_RUN_STATUS.FAILED,
      threadsSeen,
      newMessages,
      error: message,
    })
    throw error
  }
}
