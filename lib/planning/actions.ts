'use server'

import { revalidatePath } from 'next/cache'

import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { apiFetch } from '@/lib/api/client'
import { currentSessionId, requireRole } from '@/lib/auth/session'

import { isKnownPlanError, planErrorMessage } from './errors'
import type {
  ApplySeasonPlanRequest,
  ApplySeasonPlanResponse,
  CancelSeasonPlanResponse,
} from './types'

/**
 * The two writes the planner makes: apply a chosen plan, and take it back.
 *
 * Both return an ActionResult rather than throwing, for the reason set out in
 * `lib/actions/result.ts`: a Server Action that throws does not hand the
 * browser its message — React substitutes a numbered placeholder in a
 * production build — and every refusal these two can give is one a pengurus is
 * meant to read. `plan_already_applied` and `plan_partially_cancellable`
 * especially: both are answers, not faults.
 *
 * The role check is repeated here even though both screens hide their buttons
 * from a kader. The hidden button is a courtesy; this is the boundary.
 */

/**
 * Writes the chosen plan and its planting blocks.
 *
 * Only plot, variety and date travel back — every tonne, window and rupiah is
 * recomputed by Go from its own candidate table, so sending the figures it
 * gave us would be neither used nor believed.
 */
export async function applyPlan(
  request: ApplySeasonPlanRequest,
): Promise<ActionResult<ApplySeasonPlanResponse>> {
  return attempt(async () => {
    await requireRole(['pengurus'])
    const sessionId = await currentSessionId()

    if (request.assignments.length === 0) {
      throw new ExpectedFailure(
        'Tidak ada satu pun penugasan pada rencana ini, jadi tidak ada yang bisa diterapkan.',
      )
    }

    try {
      const applied = await apiFetch<ApplySeasonPlanResponse>('/api/plans', {
        method: 'POST',
        sessionId,
        body: request,
      })
      // The whole point of the feature: the dashboard's collision alert, the
      // RDKK sheet and the plot list all read next season's blocks, and all
      // three are cached routes that would otherwise still show the season as
      // empty right after it was filled.
      revalidatePath('/rencana')
      revalidatePath('/dashboard')
      revalidatePath('/plots')
      revalidatePath('/purchases')
      return applied
    } catch (error) {
      if (isKnownPlanError(error)) throw new ExpectedFailure(planErrorMessage(error))
      throw error
    }
  })
}

/**
 * Takes a plan back and releases the blocks it wrote.
 *
 * Cancellation is part of the feature, not an escape hatch: seasons change and
 * a cooperative is entitled to change its mind (decision K3). What it never
 * touches is a kader's own record — `plan_partially_cancellable` is the
 * backend refusing to unpick blocks that have already been harvested.
 */
export async function cancelPlan(
  id: string,
): Promise<ActionResult<CancelSeasonPlanResponse>> {
  return attempt(async () => {
    await requireRole(['pengurus'])
    const sessionId = await currentSessionId()

    try {
      const cancelled = await apiFetch<CancelSeasonPlanResponse>(`/api/plans/${id}/cancel`, {
        method: 'POST',
        sessionId,
      })
      revalidatePath('/rencana')
      revalidatePath(`/rencana/${id}`)
      revalidatePath('/dashboard')
      revalidatePath('/plots')
      revalidatePath('/purchases')
      return cancelled
    } catch (error) {
      if (isKnownPlanError(error)) throw new ExpectedFailure(planErrorMessage(error))
      throw error
    }
  })
}
