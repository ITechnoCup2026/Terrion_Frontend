import { describe, expect, it } from 'vitest'

import { buildApplyRequest, countEdits, isEdited, overriddenAssignment } from './apply'
import type { CandidatePlanResponse, PlanAssignmentResponse, SeasonResponse } from './types'

const season: SeasonResponse = {
  label: 'MT I 2026/2027',
  start: '2026-10-01',
  end: '2027-03-31',
  planting_from: '2026-10-01',
  planting_to: '2026-11-30',
}

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

const plan: CandidatePlanResponse = {
  objective: 'aman',
  narrative: '',
  metrics: {
    peak_tonnes_expected: 8.2,
    peak_tonnes_worst: 11.4,
    gross_value: null,
    demand_covered_kg: 0,
    total_tonnes_mid: 42,
    flagged_weeks: 0,
  },
  assignments: [assignment(), assignment({ plot_id: 'plot-2', variety_id: 'inpari-32' })],
  thresholds: [],
  flagged: [],
  fertiliser: [],
  fertiliser_unrated: [],
  over_subsidy_cap: [],
}

describe('buildApplyRequest', () => {
  // Every figure is recomputed by Go from its own candidate table, so sending
  // tonnage or windows back would be dead weight -- and an invitation to a
  // client that edits them.
  it('sends back only plot, variety and date', () => {
    const request = buildApplyRequest(season, plan)
    expect(request.season_label).toBe('MT I 2026/2027')
    expect(request.objective).toBe('aman')
    expect(request.assignments[0]).toEqual({
      plot_id: 'plot-1',
      variety_id: 'ciherang',
      planting_date: '2026-10-05',
    })
  })

  // Principle P1: the planner proposes, the pengurus decides. An edit that
  // does not reach the request would apply a plan other than the one on
  // screen, and nothing on screen would say so.
  it('carries a hand edit through to the request', () => {
    const request = buildApplyRequest(season, plan, {
      'plot-1': { variety_id: 'inpari-42', planting_date: '2026-10-19' },
    })
    expect(request.assignments[0]).toEqual({
      plot_id: 'plot-1',
      variety_id: 'inpari-42',
      planting_date: '2026-10-19',
    })
  })

  it('leaves an untouched row exactly as the planner chose it', () => {
    const request = buildApplyRequest(season, plan, { 'plot-1': { variety_id: 'inpari-42' } })
    expect(request.assignments[1]).toEqual({
      plot_id: 'plot-2',
      variety_id: 'inpari-32',
      planting_date: '2026-10-05',
    })
  })

  it('accepts a partial edit without dropping the other field', () => {
    const request = buildApplyRequest(season, plan, { 'plot-1': { planting_date: '2026-11-02' } })
    expect(request.assignments[0]).toEqual({
      plot_id: 'plot-1',
      variety_id: 'ciherang',
      planting_date: '2026-11-02',
    })
  })
})

describe('isEdited', () => {
  it('ignores an override that changes nothing', () => {
    expect(isEdited(assignment(), { 'plot-1': { variety_id: 'ciherang' } })).toBe(false)
  })

  it('flags a row whose variety or date was changed', () => {
    expect(isEdited(assignment(), { 'plot-1': { variety_id: 'inpari-42' } })).toBe(true)
    expect(isEdited(assignment(), { 'plot-1': { planting_date: '2026-11-02' } })).toBe(true)
  })
})

describe('overriddenAssignment', () => {
  it('keeps every figure it was given -- they belong to the original row', () => {
    const merged = overriddenAssignment(assignment(), {
      'plot-1': { planting_date: '2026-11-02' },
    })
    expect(merged.planting_date).toBe('2026-11-02')
    // Deliberately stale: Go recomputes these, and the screen has to say so
    // rather than pretend the numbers describe the edit.
    expect(merged.harvest_start).toBe('2027-01-20')
    expect(merged.tonnes_mid).toBe(2.6)
  })
})

describe('countEdits', () => {
  it('counts only the rows that actually differ', () => {
    expect(countEdits(plan)).toBe(0)
    expect(countEdits(plan, {
      'plot-1': { variety_id: 'inpari-42' },
      'plot-2': { variety_id: 'inpari-32' },
    })).toBe(1)
  })
})
