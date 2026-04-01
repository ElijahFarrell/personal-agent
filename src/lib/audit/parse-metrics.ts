/**
 * Best-effort extraction of weekly hours saved from audit report markdown.
 * The model is instructed to use "**Total estimated time saved:** X–Y hours per week".
 */
export function parseHoursPerWeekFromMarkdown(md: string): {
  min: number
  max: number
} | null {
  const patterns = [
    /\*\*Total estimated time saved:\*\*\s*[:\s]*([0-9]+)\s*[–\-]\s*([0-9]+)\s*hours?\s*per\s*week/i,
    /\*\*Total estimated time saved:\*\*\s*[:\s]*([0-9]+)\s*to\s+([0-9]+)\s*hours?\s*per\s*week/i,
    /total estimated time saved[^0-9]*([0-9]+)\s*[–\-]\s*([0-9]+)\s*hours?\s*(?:\/|\s*per\s*)?\s*week/i,
  ]
  for (const re of patterns) {
    const m = md.match(re)
    if (m) {
      const a = parseInt(m[1], 10)
      const b = parseInt(m[2], 10)
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        return { min: Math.min(a, b), max: Math.max(a, b) }
      }
    }
  }
  return null
}
