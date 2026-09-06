import { describe, expect, it } from 'vitest'

import { ApiError, NETWORK_ERROR } from '@/lib/api/client'
import { isKnownPlanError, planErrorMessage } from './errors'

describe('planErrorMessage', () => {
  it('translates a refusal the reader can act on', () => {
    const message = planErrorMessage(new ApiError(422, 'plan_no_plots'))
    expect(message).toContain('belum punya lahan terdaftar')
    expect(message).not.toContain('plan_no_plots')
  })

  // The pengurus wrote too much, which is the one refusal caused by something
  // they can see and fix. It has to name the limit, and it must not read as a
  // fault in the plan itself.
  it('names the goal limit rather than the code', () => {
    const message = planErrorMessage(new ApiError(422, 'plan_goal_too_long'))
    expect(message).toContain('500 aksara')
    expect(message).not.toContain('plan_goal_too_long')
  })

  // "I could not ask" must stay distinguishable from "the answer is no":
  // an unreachable backend wrote nothing, and the remedy is only to wait.
  it('separates an unreachable backend from a real refusal', () => {
    expect(planErrorMessage(new ApiError(NETWORK_ERROR, 'network_unreachable')))
      .toContain('tidak bisa dihubungi')
  })

  // `season is required` means this app sent a malformed query. The reader
  // cannot fix that, and printing the code would only make them try.
  it('hides a bug in this app behind the generic sentence', () => {
    expect(planErrorMessage(new ApiError(400, 'season is required')))
      .toContain('Coba lagi')
    expect(planErrorMessage(new ApiError(500, 'http_500')))
      .toContain('Coba lagi')
  })

  it('never leaks a raw code for something it does not recognise', () => {
    expect(planErrorMessage(new Error('boom'))).not.toContain('boom')
  })
})

describe('isKnownPlanError', () => {
  it('claims only the failures it has a sentence for', () => {
    expect(isKnownPlanError(new ApiError(422, 'plan_season_closed'))).toBe(true)
    expect(isKnownPlanError(new ApiError(422, 'plan_goal_too_long'))).toBe(true)
    expect(isKnownPlanError(new ApiError(NETWORK_ERROR, 'network_unreachable'))).toBe(true)
    expect(isKnownPlanError(new ApiError(500, 'http_500'))).toBe(false)
    expect(isKnownPlanError(new Error('boom'))).toBe(false)
  })
})
