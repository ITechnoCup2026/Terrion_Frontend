import { describe, expect, it } from 'vitest'

import { commodityBreakdown, harvestByMonth, planTotals } from './summary'
import type { SeasonPlanItemResponse } from './types'

function item(over: Partial<SeasonPlanItemResponse> = {}): SeasonPlanItemResponse {
  return {
    id: 'item-1',
    plot_id: 'plot-1',
    plot_name: 'Sebelah Kali',
    member_id: 'member-1',
    member_name: 'Ujang',
    commodity_id: 'padi',
    commodity_name: 'Padi',
    variety_id: 'ciherang',
    variety_name: 'Ciherang',
    area_ha: 0.5,
    planting_date: '2026-10-05',
    harvest_start: '2027-01-20',
    harvest_end: '2027-02-03',
    plausibility: 'ok',
    tonnes_low: 2,
    tonnes_mid: 2.5,
    tonnes_high: 3,
    block_id: 'block-1',
    ...over,
  }
}

describe('planTotals', () => {
  it('counts members and commodities once each, not once per plot', () => {
    const totals = planTotals([
      item({ id: 'a', member_id: 'm1', commodity_id: 'padi' }),
      item({ id: 'b', member_id: 'm1', commodity_id: 'padi' }),
      item({ id: 'c', member_id: 'm2', commodity_id: 'cabai' }),
    ])

    expect(totals.plots).toBe(3)
    expect(totals.members).toBe(2)
    expect(totals.commodities).toBe(2)
  })

  it('carries the range, not just the middle of it', () => {
    const totals = planTotals([
      item({ id: 'a', tonnes_low: 2, tonnes_mid: 2.5, tonnes_high: 3 }),
      item({ id: 'b', tonnes_low: 4, tonnes_mid: 5, tonnes_high: 6.5 }),
    ])

    expect(totals.tonnesLow).toBeCloseTo(6)
    expect(totals.tonnesMid).toBeCloseTo(7.5)
    expect(totals.tonnesHigh).toBeCloseTo(9.5)
  })

  // Decision K3: a plan is a record, and a row whose block is gone must stop
  // looking live. The count is what the cancel button is sized against.
  it('separates rows whose block still stands from rows released', () => {
    const totals = planTotals([
      item({ id: 'a', block_id: 'block-1' }),
      item({ id: 'b', block_id: null }),
    ])

    expect(totals.liveBlocks).toBe(1)
  })

  it('splits doubtful windows from merely unusual ones', () => {
    const totals = planTotals([
      item({ id: 'a', plausibility: 'implausible' }),
      item({ id: 'b', plausibility: 'early' }),
      item({ id: 'c', plausibility: 'late' }),
      item({ id: 'd', plausibility: 'ok' }),
    ])

    expect(totals.doubtful).toBe(1)
    expect(totals.offWindow).toBe(2)
  })

  it('has an answer for a plan with no items', () => {
    const totals = planTotals([])
    expect(totals.plots).toBe(0)
    expect(totals.areaHa).toBe(0)
    expect(totals.members).toBe(0)
  })
})

describe('harvestByMonth', () => {
  it('groups by the month a window opens, and adds the mid estimates', () => {
    const months = harvestByMonth([
      item({ id: 'a', harvest_start: '2027-01-05', tonnes_mid: 2 }),
      item({ id: 'b', harvest_start: '2027-01-28', tonnes_mid: 3 }),
    ])

    expect(months).toHaveLength(1)
    expect(months[0].label).toBe('Jan 2027')
    expect(months[0].tonnesMid).toBeCloseTo(5)
    expect(months[0].plots).toBe(2)
  })

  // A month absent from the strip would read as "no data". "Nothing ripens in
  // February" is a different statement, and it is the one a pengurus spreading
  // a harvest needs to see.
  it('returns empty months as zero rather than dropping them', () => {
    const months = harvestByMonth([
      item({ id: 'a', harvest_start: '2027-01-10' }),
      item({ id: 'b', harvest_start: '2027-03-10' }),
    ])

    expect(months.map(m => m.label)).toEqual(['Jan 2027', 'Feb 2027', 'Mar 2027'])
    expect(months[1].tonnesMid).toBe(0)
    expect(months[1].plots).toBe(0)
  })

  it('crosses a year boundary in order', () => {
    const months = harvestByMonth([
      item({ id: 'a', harvest_start: '2026-12-02' }),
      item({ id: 'b', harvest_start: '2027-02-02' }),
    ])

    expect(months.map(m => m.label)).toEqual(['Des 2026', 'Jan 2027', 'Feb 2027'])
  })

  // The window is bucketed whole at its start: splitting it would mean
  // inventing a distribution inside the window, which is the engine's job and
  // not this file's.
  it('counts a window that straddles two months in the one it opens in', () => {
    const months = harvestByMonth([
      item({ id: 'a', harvest_start: '2027-02-26', harvest_end: '2027-03-12', tonnes_mid: 4 }),
    ])

    expect(months).toHaveLength(1)
    expect(months[0].label).toBe('Feb 2027')
    expect(months[0].tonnesMid).toBeCloseTo(4)
  })

  it('reads dates as UTC, so a WIB reader is not shown the previous month', () => {
    // Midnight UTC on 1 March is 07:00 WIB the same day. Read locally in a
    // negative-offset zone this would fall back into February.
    const months = harvestByMonth([item({ id: 'a', harvest_start: '2027-03-01' })])
    expect(months[0].label).toBe('Mar 2027')
  })

  it('has nothing to draw for a plan with no items', () => {
    expect(harvestByMonth([])).toEqual([])
  })
})

describe('commodityBreakdown', () => {
  it('rolls plots up per commodity, heaviest first', () => {
    const rows = commodityBreakdown([
      item({ id: 'a', commodity_id: 'padi', commodity_name: 'Padi', area_ha: 0.5, tonnes_mid: 2 }),
      item({ id: 'b', commodity_id: 'padi', commodity_name: 'Padi', area_ha: 0.75, tonnes_mid: 3 }),
      item({ id: 'c', commodity_id: 'cabai', commodity_name: 'Cabai', area_ha: 0.4, tonnes_mid: 8 }),
    ])

    expect(rows.map(r => r.commodityName)).toEqual(['Cabai', 'Padi'])
    expect(rows[1].plots).toBe(2)
    expect(rows[1].areaHa).toBeCloseTo(1.25)
    expect(rows[1].tonnesMid).toBeCloseTo(5)
  })

  it('has nothing to say about an empty plan', () => {
    expect(commodityBreakdown([])).toEqual([])
  })
})
