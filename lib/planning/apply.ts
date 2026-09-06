import type {
  ApplySeasonPlanRequest,
  CandidatePlanResponse,
  PlanAssignmentResponse,
  SeasonResponse,
} from './types'

/**
 * Turning a chosen plan — and the pengurus's own edits to it — into the
 * request `POST /api/plans` accepts.
 *
 * Kept pure and out of the Server Action file so it can be tested directly:
 * this is the one place where a hand edit can quietly fail to reach the
 * backend, and the failure would be invisible (the plan applies, just not the
 * one on screen).
 */

/** What a pengurus may change on a row before applying. */
export type AssignmentOverride = {
  variety_id?: string
  planting_date?: string
}

/** Keyed by plot id, because a plot appears at most once in a plan. */
export type AssignmentOverrides = Record<string, AssignmentOverride>

/** The row as it now stands, with any hand edit applied over the proposal. */
export function overriddenAssignment(
  assignment: PlanAssignmentResponse,
  overrides: AssignmentOverrides = {},
): PlanAssignmentResponse {
  const edit = overrides[assignment.plot_id]
  if (!edit) return assignment
  return {
    ...assignment,
    variety_id: edit.variety_id ?? assignment.variety_id,
    planting_date: edit.planting_date ?? assignment.planting_date,
  }
}

/**
 * True when this row no longer matches what the planner proposed.
 *
 * An edited row's tonnage and harvest window on screen still belong to the
 * *original* variety and date — Go recomputes both on apply — so the screen
 * has to stop presenting those figures as if they described the edit.
 */
export function isEdited(
  assignment: PlanAssignmentResponse,
  overrides: AssignmentOverrides = {},
): boolean {
  const edit = overrides[assignment.plot_id]
  if (!edit) return false
  return (edit.variety_id !== undefined && edit.variety_id !== assignment.variety_id)
    || (edit.planting_date !== undefined && edit.planting_date !== assignment.planting_date)
}

/**
 * The apply request for one candidate plan.
 *
 * Three fields per assignment, and nothing else. Every tonne, window and
 * rupiah is recomputed by Go from its own candidate table, so returning the
 * figures it gave us would be neither used nor believed — and would be a
 * standing invitation to a client that edits them.
 */
export function buildApplyRequest(
  season: SeasonResponse,
  plan: CandidatePlanResponse,
  overrides: AssignmentOverrides = {},
): ApplySeasonPlanRequest {
  return {
    season_label: season.label,
    objective: plan.objective,
    assignments: plan.assignments.map(a => {
      const merged = overriddenAssignment(a, overrides)
      return {
        plot_id: merged.plot_id,
        variety_id: merged.variety_id,
        planting_date: merged.planting_date,
      }
    }),
  }
}

/** How many rows the pengurus changed by hand. */
export function countEdits(
  plan: CandidatePlanResponse,
  overrides: AssignmentOverrides = {},
): number {
  return plan.assignments.filter(a => isEdited(a, overrides)).length
}
