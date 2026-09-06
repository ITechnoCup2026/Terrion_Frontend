import { describe, expect, it } from 'vitest'

import {
  defaultSeason, nextSeason, seasonAt, seasonLabel, seasonOption, upcomingSeasons,
} from './season'

const utc = (s: string) => new Date(`${s}T00:00:00Z`)

describe('seasonLabel', () => {
  // The label is the API key, so its shape is a contract rather than a
  // display choice: MT I spans a new year and is named for both.
  it('names MT I for the two years it spans and MT II for the one', () => {
    expect(seasonLabel('I', 2026)).toBe('MT I 2026/2027')
    expect(seasonLabel('II', 2027)).toBe('MT II 2027')
  })
})

describe('seasonOption', () => {
  it('runs MT I from October into the following March', () => {
    expect(seasonOption('I', 2026)).toMatchObject({
      start: '2026-10-01',
      end: '2027-03-31',
      range: 'Okt 2026 – Mar 2027',
    })
  })

  it('keeps MT II inside its own year', () => {
    expect(seasonOption('II', 2027)).toMatchObject({
      start: '2027-04-01',
      end: '2027-09-30',
      range: 'Apr – Sep 2027',
    })
  })
})

describe('seasonAt', () => {
  it('puts October through December in the MT I that starts that year', () => {
    expect(seasonAt(utc('2026-10-01')).label).toBe('MT I 2026/2027')
    expect(seasonAt(utc('2026-12-31')).label).toBe('MT I 2026/2027')
  })

  // The trap: January is inside a season that began the previous October, so
  // reading the calendar year off the date names the wrong season entirely.
  it('keeps January through March in the season that began last October', () => {
    expect(seasonAt(utc('2027-01-05')).label).toBe('MT I 2026/2027')
    expect(seasonAt(utc('2027-03-31')).label).toBe('MT I 2026/2027')
  })

  it('puts April through September in MT II of that year', () => {
    expect(seasonAt(utc('2026-04-01')).label).toBe('MT II 2026')
    expect(seasonAt(utc('2026-09-30')).label).toBe('MT II 2026')
  })
})

describe('nextSeason', () => {
  it('alternates the two seasons without leaving a gap', () => {
    const mt1 = seasonOption('I', 2026)          // Okt 2026 – Mar 2027
    const mt2 = nextSeason(mt1)                  // Apr 2027 – Sep 2027
    expect(mt2.label).toBe('MT II 2027')
    expect(mt2.start > mt1.end).toBe(true)
    expect(nextSeason(mt2).label).toBe('MT I 2027/2028')
  })
})

describe('upcomingSeasons', () => {
  it('opens on the season running now and counts forward', () => {
    expect(upcomingSeasons(utc('2026-09-05'), 3).map(s => s.label)).toEqual([
      'MT II 2026', 'MT I 2026/2027', 'MT II 2027',
    ])
  })
})

describe('defaultSeason', () => {
  // The feature exists to be used before planting, so the pre-selected target
  // is the season that has not started, not the one already in the ground.
  it('targets the season that has not begun', () => {
    expect(defaultSeason(utc('2026-09-05')).label).toBe('MT I 2026/2027')
  })
})
