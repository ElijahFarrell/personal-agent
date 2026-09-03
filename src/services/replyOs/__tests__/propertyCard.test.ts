import { describe, expect, it } from 'vitest'
import { PROPERTY_KIND } from '@convex/constants'
import { formatPropertyCard } from '../propertyCard'

describe('formatPropertyCard', () => {
  it('renders a compact text block', () => {
    const text = formatPropertyCard({
      kind: PROPERTY_KIND.LAND,
      addressLine: '123 Main',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      county: 'Travis',
      apn: '1-2-3',
      acres: 5,
      lastOfferAmount: 10000,
      lastOfferAt: Date.parse('2026-01-15T00:00:00.000Z'),
      notes: 'mailer sent',
    })
    expect(text).toContain('Kind: land')
    expect(text).toContain('Address: 123 Main, Austin, TX, 78701')
    expect(text).toContain('County: Travis')
    expect(text).toContain('APN: 1-2-3')
    expect(text).toContain('Acres: 5')
    expect(text).toContain('Last offer: 10000 on 2026-01-15')
    expect(text).toContain('Notes: mailer sent')
  })
})
