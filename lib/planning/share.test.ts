import { describe, it, expect } from 'vitest'

import {
  planShareMessage, planShareUrl, shareTally, sortShares, whatsappNumber, whatsappShareUrl,
} from './share'
import type { MemberShareResponse } from './types'

const share = (over: Partial<MemberShareResponse> = {}): MemberShareResponse => ({
  member_id: 'm1',
  member_name: 'Pak Asep',
  member_phone: '081234567890',
  share_token: '3f29a1b0-1111-4111-8111-111111111111',
  viewed: false,
  first_viewed_at: null,
  ...over,
})

describe('whatsappNumber', () => {
  it('rewrites the Indonesian trunk zero into the country code', () => {
    expect(whatsappNumber('081234567890')).toBe('6281234567890')
  })

  it('accepts a number a kader typed with spaces and dashes', () => {
    expect(whatsappNumber(' 0812-3456-7890 ')).toBe('6281234567890')
  })

  it('adds the country code to a number written without its trunk zero', () => {
    expect(whatsappNumber('81234567890')).toBe('6281234567890')
  })

  it('leaves a number that already carries 62 alone', () => {
    expect(whatsappNumber('6281234567890')).toBe('6281234567890')
    expect(whatsappNumber('+62 812 3456 7890')).toBe('6281234567890')
  })

  // Guessing +62 for a foreign code would dial a stranger, so a number that
  // announces its own country keeps it.
  it('does not rewrite a foreign country code', () => {
    expect(whatsappNumber('+60123456789')).toBe('60123456789')
  })

  it('is null for nothing at all', () => {
    expect(whatsappNumber(null)).toBeNull()
    expect(whatsappNumber(undefined)).toBeNull()
    expect(whatsappNumber('')).toBeNull()
    expect(whatsappNumber('   ')).toBeNull()
  })

  // The field is free text on the backend: whatever is in it, the button has
  // to fall back rather than build a link to a number that cannot exist.
  it('is null for text that is not a number', () => {
    expect(whatsappNumber('tidak punya HP')).toBeNull()
  })

  it('is null for a fragment too short or too long to be a phone number', () => {
    expect(whatsappNumber('1234')).toBeNull()
    expect(whatsappNumber('6281234567890123456')).toBeNull()
  })
})

describe('planShareUrl', () => {
  it('hangs the token off the public path', () => {
    expect(planShareUrl('https://terrion.app', 'abc-123'))
      .toBe('https://terrion.app/rencana-saya/abc-123')
  })

  it('does not double the slash when the origin carries one', () => {
    expect(planShareUrl('https://terrion.app/', 'abc-123'))
      .toBe('https://terrion.app/rencana-saya/abc-123')
  })
})

describe('planShareMessage', () => {
  const base = {
    memberName: 'Pak Asep',
    cooperativeName: 'KUD Subang',
    seasonLabel: 'MT I 2026/2027',
    url: 'https://terrion.app/rencana-saya/abc-123',
  }

  it('names the farmer, the season, the cooperative and the link', () => {
    const text = planShareMessage(base)
    expect(text).toContain('Pak Asep')
    expect(text).toContain('MT I 2026/2027')
    expect(text).toContain('KUD Subang')
    expect(text).toContain(base.url)
  })

  it('reads without the cooperative when there is none to name', () => {
    const text = planShareMessage({ ...base, cooperativeName: null })
    expect(text).not.toContain('dari ')
    expect(text).toContain(base.url)
  })

  // Every figure on the page can change; a tonnage pasted into WhatsApp
  // cannot. The message carries the link and nothing the link would contradict.
  it('carries no figures', () => {
    expect(planShareMessage(base)).not.toMatch(/\d+(,|\.)\d+\s*(t|ha|kg)/)
  })
})

describe('whatsappShareUrl', () => {
  it('addresses the chat when the number is usable', () => {
    const url = whatsappShareUrl('081234567890', 'halo')
    expect(url).toBe('https://wa.me/6281234567890?text=halo')
  })

  it('falls back to the contact picker when there is no number', () => {
    expect(whatsappShareUrl(null, 'halo')).toBe('https://wa.me/?text=halo')
  })

  it('encodes the message, newlines and all', () => {
    const url = whatsappShareUrl(null, 'baris satu\nbaris dua & tiga')
    expect(url).toContain('baris%20satu%0Abaris%20dua%20%26%20tiga')
  })
})

describe('shareTally', () => {
  it('counts what was opened and how many can be sent directly', () => {
    expect(shareTally([
      share({ member_id: 'a', viewed: true }),
      share({ member_id: 'b', member_phone: null }),
      share({ member_id: 'c', member_phone: 'tidak ada' }),
    ])).toEqual({ total: 3, opened: 1, withPhone: 1 })
  })

  it('is all zeroes for a plan with no shares', () => {
    expect(shareTally([])).toEqual({ total: 0, opened: 0, withPhone: 0 })
  })
})

describe('sortShares', () => {
  it('puts the links nobody has opened first, then sorts by name', () => {
    const sorted = sortShares([
      share({ member_id: 'a', member_name: 'Bu Sari', viewed: true }),
      share({ member_id: 'b', member_name: 'Pak Endang' }),
      share({ member_id: 'c', member_name: 'Bu Ani' }),
    ])
    expect(sorted.map(s => s.member_name)).toEqual(['Bu Ani', 'Pak Endang', 'Bu Sari'])
  })

  it('does not mutate the list it was given', () => {
    const rows = [share({ member_id: 'a', viewed: true }), share({ member_id: 'b' })]
    sortShares(rows)
    expect(rows[0].member_id).toBe('a')
  })
})
