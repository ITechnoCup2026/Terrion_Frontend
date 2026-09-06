import { describe, expect, it } from 'vitest'

import { fromOverSubsidyCap, membersOverSubsidyCap } from './members'
import { SUBSIDY_CAP_HA } from '@/lib/rdkk/aggregate'
import type { PlanAssignmentResponse } from './types'

function assignment(over: Partial<PlanAssignmentResponse> = {}): PlanAssignmentResponse {
  return {
    plot_id: 'plot-1',
    plot_name: 'Sebelah Kali',
    member_id: 'member-1',
    member_name: 'Ujang',
    area_ha: 0.5,
    commodity_id: 'padi',
    variety_id: 'ciherang',
    variety_name: 'Ciherang',
    planting_date: '2026-10-05',
    harvest_start: '2027-01-20',
    harvest_end: '2027-02-03',
    plausibility: 'ok',
    tonnes_low: 2.1,
    tonnes_mid: 2.6,
    tonnes_high: 3.1,
    ...over,
  }
}

describe('membersOverSubsidyCap', () => {
  // The cap is per farmer, so a member holding three plots is over it long
  // before any one plot is. Summing across plots is the whole point.
  it('adds a member up across every plot they hold', () => {
    const over = membersOverSubsidyCap([
      assignment({ plot_id: 'a', area_ha: 0.9 }),
      assignment({ plot_id: 'b', area_ha: 0.9 }),
      assignment({ plot_id: 'c', area_ha: 0.6 }),
    ])

    expect(over).toHaveLength(1)
    expect(over[0].areaHa).toBeCloseTo(2.4)
    expect(over[0].excessHa).toBeCloseTo(0.4)
  })

  it('keeps members apart', () => {
    const over = membersOverSubsidyCap([
      assignment({ member_id: 'm1', member_name: 'Ujang', area_ha: 1.8 }),
      assignment({ member_id: 'm2', member_name: 'Sri', area_ha: 1.8 }),
    ])

    expect(over).toEqual([])
  })

  // Same boundary Go tests for (`TestSubsidyCapIsTwoHectares`): exactly at the
  // cap is still eligible. A screen that flagged 2,00 ha would send a pengurus
  // to argue with a form that says they are fine.
  it('does not flag a member sitting exactly on the cap', () => {
    expect(membersOverSubsidyCap([assignment({ area_ha: SUBSIDY_CAP_HA })])).toEqual([])
    expect(membersOverSubsidyCap([assignment({ area_ha: SUBSIDY_CAP_HA + 0.01 })])).toHaveLength(1)
  })

  it('names the members, and puts the largest overshoot first', () => {
    const over = membersOverSubsidyCap([
      assignment({ member_id: 'm1', member_name: 'Ujang', area_ha: 2.3 }),
      assignment({ member_id: 'm2', member_name: 'Endang', area_ha: 4 }),
    ])

    expect(over.map(m => m.memberName)).toEqual(['Endang', 'Ujang'])
  })

  it('has nothing to say about an empty plan', () => {
    expect(membersOverSubsidyCap([])).toEqual([])
  })
})

describe('fromOverSubsidyCap', () => {
  // The planner's own list wins where it exists: same cap, same areas, applied
  // by the process that will actually write the blocks. This only reshapes it.
  it('keeps the backend figures and orders by overshoot', () => {
    const rows = fromOverSubsidyCap([
      { member_id: 'm1', member_name: 'Bu Sri', planted_ha: 2.4, excess_ha: 0.4 },
      { member_id: 'm2', member_name: 'Pak Endang', planted_ha: 3.5, excess_ha: 1.5 },
    ])

    expect(rows.map(r => r.memberName)).toEqual(['Pak Endang', 'Bu Sri'])
    expect(rows[0].areaHa).toBe(3.5)
    expect(rows[0].excessHa).toBe(1.5)
  })

  it('is empty when nobody is over', () => {
    expect(fromOverSubsidyCap([])).toEqual([])
  })
})
