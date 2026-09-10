const CAMPAIGN_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

const STORAGE_KEY = 'shiloh_campaign'

function readSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search)
}

export function persistCampaignParams(): void {
  const incoming = readSearchParams()
  const next = new URLSearchParams()
  for (const key of CAMPAIGN_KEYS) {
    const value = incoming.get(key)
    if (value) next.set(key, value)
  }
  if ([...next.keys()].length === 0) return
  try {
    sessionStorage.setItem(STORAGE_KEY, next.toString())
  } catch {
    /* ignore quota / private mode */
  }
}

export function appendStoredCampaign(url: string): string {
  if (typeof window === 'undefined') return url
  let stored: string | null = null
  try {
    stored = sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return url
  }
  if (!stored) return url

  try {
    const parsed = new URL(url, window.location.origin)
    const params = new URLSearchParams(stored)
    params.forEach((value, key) => {
      if (!parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, value)
      }
    })
    return parsed.toString()
  } catch {
    return url
  }
}
