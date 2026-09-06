import { describe, expect, it } from 'vitest'

import { formatIsoWeek, isoWeekMonday } from './week'
import { isoWeekKey } from '@/lib/agronomy/dates'

describe('isoWeekMonday', () => {
  it('is the inverse of isoWeekKey', () => {
    for (const iso of ['2026-10-05', '2027-01-04', '2027-03-31', '2028-02-29']) {
      const date = new Date(`${iso}T00:00:00Z`)
      const monday = isoWeekMonday(isoWeekKey(date))
      expect(monday).not.toBeNull()
      expect(isoWeekKey(monday!)).toBe(isoWeekKey(date))
    }
  })

  it('returns a Monday', () => {
    expect(isoWeekMonday('2027-W03')?.getUTCDay()).toBe(1)
  })

  // A week numbered in one year can start in the previous one. Reading it as
  // "1 January plus n weeks" puts the whole flagged list a week out exactly
  // where a season crosses the new year -- which is where these plans live.
  it('handles a week that begins in the previous calendar year', () => {
    expect(isoWeekMonday('2026-W01')?.toISOString().slice(0, 10)).toBe('2025-12-29')
  })

  it('refuses anything that is not a week key', () => {
    expect(isoWeekMonday('2027-W00')).toBeNull()
    expect(isoWeekMonday('2027-W54')).toBeNull()
    expect(isoWeekMonday('minggu depan')).toBeNull()
  })
})

describe('formatIsoWeek', () => {
  it('names the days rather than the ordinal', () => {
    expect(formatIsoWeek('2027-W03')).toBe('18–24 Jan 2027')
  })

  it('keeps the year on a week that crosses one', () => {
    expect(formatIsoWeek('2026-W01')).toBe('29 Des 2025 – 4 Jan 2026')
  })

  it('leaves an unparseable key alone rather than inventing a date', () => {
    expect(formatIsoWeek('kapan-kapan')).toBe('kapan-kapan')
  })
})
