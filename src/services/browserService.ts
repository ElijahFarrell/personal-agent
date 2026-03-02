/**
 * Browser automation service using Playwright.
 * Provides controlled, sandboxed web automation capabilities.
 *
 * Note: Playwright must be installed separately: npx playwright install chromium
 */
export interface BrowserResult {
  success: boolean
  content?: string
  title?: string
  error?: string
}

const DEFAULT_TIMEOUT_MS = 30_000

async function getChromium() {
  try {
    const { chromium } = await import('playwright')
    return chromium
  } catch {
    throw new Error(
      'Playwright is not installed. Run: npx playwright install chromium'
    )
  }
}

/**
 * Navigate to a URL and return page title + content.
 */
export async function navigate(url: string): Promise<BrowserResult> {
  try {
    const chromium = await getChromium()
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      await page.goto(url, { timeout: DEFAULT_TIMEOUT_MS, waitUntil: 'domcontentloaded' })
      const title = await page.title()
      const content = await page.evaluate(() => document.body?.innerText ?? '')
      return { success: true, title, content }
    } finally {
      await browser.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Extract text content from a page.
 * If selector provided: extract only that element's text.
 * Otherwise: extract main content area, excluding nav/footer.
 */
export async function extractContent(
  url: string,
  selector?: string
): Promise<BrowserResult> {
  try {
    const chromium = await getChromium()
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      await page.goto(url, { timeout: DEFAULT_TIMEOUT_MS, waitUntil: 'domcontentloaded' })

      let content: string
      if (selector) {
        const el = await page.$(selector)
        content = el ? await el.innerText() : ''
      } else {
        content = await page.evaluate(() => {
          const main =
            document.querySelector('main') ??
            document.querySelector('article') ??
            document.querySelector('[role="main"]') ??
            document.body
          if (!main) return ''
          const nav = main.querySelector('nav')
          const footer = main.querySelector('footer')
          const clone = main.cloneNode(true) as HTMLElement
          clone.querySelectorAll('nav, footer, script, style').forEach((n) => n.remove())
          return clone.innerText ?? ''
        })
      }

      const title = await page.title()
      return { success: true, title, content: content.trim() }
    } finally {
      await browser.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Fill a form and submit. Returns success status and result/confirmation text.
 */
export async function fillAndSubmit(
  url: string,
  formData: Record<string, string>,
  submitSelector: string
): Promise<BrowserResult> {
  try {
    const chromium = await getChromium()
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      await page.goto(url, { timeout: DEFAULT_TIMEOUT_MS, waitUntil: 'domcontentloaded' })

      for (const [name, value] of Object.entries(formData)) {
        await page.fill(`[name="${name}"], #${name}`, value)
      }

      await page.click(submitSelector)
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT_MS }).catch(() => {})

      const content = await page.evaluate(() => document.body?.innerText ?? '')
      const title = await page.title()
      return { success: true, title, content: content.trim() }
    } finally {
      await browser.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Take a screenshot, return base64 encoded PNG.
 */
export async function screenshot(url: string): Promise<BrowserResult & { imageBase64?: string }> {
  try {
    const chromium = await getChromium()
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      await page.goto(url, { timeout: DEFAULT_TIMEOUT_MS, waitUntil: 'domcontentloaded' })
      const buffer = await page.screenshot({ type: 'png' })
      const imageBase64 = Buffer.from(buffer).toString('base64')
      const title = await page.title()
      return { success: true, title, content: title, imageBase64 }
    } finally {
      await browser.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}
