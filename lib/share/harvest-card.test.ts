import { describe, expect, it } from 'vitest'

import { harvestCardContent, rowsThatFit, type HarvestCardFacts } from './harvest-card'

function facts(over: Partial<HarvestCardFacts> = {}): HarvestCardFacts {
  return {
    plotName: 'Sawah Kidul',
    memberName: 'Pak Slamet Riyadi',
    place: 'Sukamaju, Kabupaten Subang',
    areaHa: 0.75,
    crops: [{ name: 'Padi', window: '8–21 Okt', tonnes: '4,5–5,8 t' }],
    url: 'terrion.app/garden/abc123',
    degraded: false,
    ...over,
  }
}

describe('harvestCardContent', () => {
  it('leads with the plot and who farms it', () => {
    const content = harvestCardContent(facts())
    expect(content.heading).toBe('Sawah Kidul')
    expect(content.subheading).toBe('Pak Slamet Riyadi')
    expect(content.meta).toBe('0,75 ha · Sukamaju, Kabupaten Subang')
  })

  it('names the farmer even when the record does not', () => {
    expect(harvestCardContent(facts({ memberName: '' })).subheading)
      .toBe('Petani tidak tercatat')
  })

  it('puts the window and the range on one row per crop', () => {
    expect(harvestCardContent(facts()).rows).toEqual([
      { label: 'Padi', value: '8–21 Okt · 4,5–5,8 t' },
    ])
  })

  it('says so rather than showing a blank row when a crop has no projection', () => {
    const content = harvestCardContent(facts({
      crops: [{ name: 'Wortel', window: null, tonnes: null }],
    }))
    expect(content.rows[0].value).toBe('Belum ada perkiraan')
  })

  it('keeps a partial projection rather than discarding it', () => {
    const content = harvestCardContent(facts({
      crops: [{ name: 'Wortel', window: '3–9 Nov', tonnes: null }],
    }))
    expect(content.rows[0].value).toBe('3–9 Nov')
  })

  it('summarises past four crops instead of overflowing the card', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({
      name: `Komoditas ${i}`, window: '8–21 Okt', tonnes: null,
    }))
    const rows = harvestCardContent(facts({ crops: many })).rows
    expect(rows).toHaveLength(5)
    expect(rows[4]).toEqual({ label: '+3 komoditas lain', value: 'Lihat halaman kebun' })
  })

  // The card is forwarded away from the page that explains itself, so the
  // hedge has to travel with it. There is no input that removes it.
  it('always carries a hedge on the numbers', () => {
    expect(harvestCardContent(facts()).footnote).toMatch(/Perkiraan panen/)
    expect(harvestCardContent(facts({ crops: [] })).footnote).toMatch(/Perkiraan panen/)
  })

  it('says when the projection ran without current weather', () => {
    expect(harvestCardContent(facts({ degraded: true })).footnote)
      .toMatch(/tanpa data cuaca terbaru/)
  })
})

describe("rowsThatFit", () => {
  // The footnote and URL are pinned to the floor of the card, so rows that run
  // long do not push them down -- they draw straight through them. This is the
  // guard that keeps the two apart.
  it('drops the row that would cross the footer rule', () => {
    // Five rows of 140 from y=400 ends at 1100, past a ceiling of 1094.
    expect(rowsThatFit(400, 1094, [140, 140, 140, 140, 140])).toBe(4)
  })

  it('keeps every row when they all fit', () => {
    expect(rowsThatFit(400, 1094, [140, 140])).toBe(2)
  })

  it('drops more rows when a two-line heading pushed the start down', () => {
    // A two-line heading starts the rows 88px lower.
    expect(rowsThatFit(488, 1094, [140, 140, 140, 140, 140])).toBe(4)
  })

  it('returns zero rather than a negative count when nothing fits', () => {
    expect(rowsThatFit(1090, 1094, [140])).toBe(0)
  })
})
