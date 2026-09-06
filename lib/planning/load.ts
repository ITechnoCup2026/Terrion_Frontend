import { apiFetch, isNotFound } from '@/lib/api/client'

import { membersOverSubsidyCap } from './members'
import type {
  CandidatePlanResponse,
  ProposalResponse,
  SeasonPlanListResponse,
  SeasonPlanResponse,
} from './types'

/**
 * Reads for `/api/plans*`, following the shape lib/plots/load.ts uses: server
 * only, one call each, no mapping into domain types.
 *
 * There is no camelCase layer here on purpose. The planner's payload is
 * ~15 fields per assignment across 47 plots, every one of them a plain number
 * or an ISO date the components print as-is; a converter would be 120 lines
 * that can only introduce a typo. The plot loader maps because it turns wire
 * dates into `Date` and merges two shapes; this does neither.
 *
 * `sessionId` is a parameter rather than read from cookies here so these stay
 * independent of next/headers, exactly as `lib/api/client.ts` is. Callers get
 * it from `currentSessionId()`.
 */

/**
 * Three candidate plans for one season. Stores nothing.
 *
 * This is slow by construction — Go walks hundreds of plot × variety × date
 * combinations, and waits on the AI service's narrative when that is up. Two
 * to four seconds is the normal case and the budget. Callers must render an
 * honest loading state and must not set a client timeout under six seconds.
 *
 * `goal` is the pengurus's own sentence, and it is deliberately omitted rather
 * than sent empty: with no goal the backend uses its default weights and skips
 * the model call entirely, which is both faster and the normal case. It is
 * also part of the cache key, so changing the sentence means waiting the full
 * two to four seconds again.
 *
 * What the sentence can and cannot do is worth keeping straight while reading
 * this: it shifts how strongly an objective is weighted, and it never becomes
 * a number. Every tonne, rupiah and date below is the deterministic solver's.
 *
 * Nothing is cached: a refresh recomputes. A screen that lets the reader
 * compare plans and come back has to hold the result in state.
 */
export async function loadProposal(
  sessionId: string | null,
  season: string,
  goal?: string,
): Promise<ProposalResponse> {
  const stated = goal?.trim()

  const proposal = await apiFetch<ProposalResponse>('/api/plans/propose', {
    sessionId,
    query: stated ? { season, goal: stated } : { season },
  })

  return normaliseProposal(proposal)
}

/**
 * The absent halves of the payload, filled in before any component sees them.
 *
 * The planner grew `limits`, `previous_season`, `thresholds`, `flagged`,
 * `fertiliser` and `over_subsidy_cap` on the backend branch this was written
 * against, and a deployment one commit behind sends a proposal without them.
 * Those fields are mapped over in half a dozen places; `undefined.map` would
 * take down the whole screen over a field that is decoration next to the
 * assignments. So the gaps are closed once, here, at the edge.
 *
 * `over_subsidy_cap` is the one gap that can be filled rather than emptied:
 * the cap is addition over `area_ha` the backend already sent, which is the
 * one calculation this app is allowed to do for itself (see ./members).
 */
function normaliseProposal(proposal: ProposalResponse): ProposalResponse {
  return {
    ...proposal,
    limits: proposal.limits ?? '',
    previous_season: proposal.previous_season ?? null,
    skipped: proposal.skipped ?? [],
    plans: (proposal.plans ?? []).map(normalisePlan),
  }
}

function normalisePlan(plan: CandidatePlanResponse): CandidatePlanResponse {
  return {
    ...plan,
    narrative: plan.narrative ?? '',
    assignments: plan.assignments ?? [],
    thresholds: plan.thresholds ?? [],
    flagged: plan.flagged ?? [],
    fertiliser: plan.fertiliser ?? [],
    fertiliser_unrated: plan.fertiliser_unrated ?? [],
    over_subsidy_cap: plan.over_subsidy_cap ?? membersOverSubsidyCap(plan.assignments ?? []).map(
      m => ({
        member_id: m.memberId,
        member_name: m.memberName,
        planted_ha: m.areaHa,
        excess_ha: m.excessHa,
      }),
    ),
  }
}

/**
 * Every saved plan, applied and cancelled alike.
 *
 * Each row comes back with `items: []` — the list deliberately carries no
 * contents. Anything that needs the assignments has to call loadPlan().
 */
export async function loadPlans(sessionId: string | null): Promise<SeasonPlanResponse[]> {
  const { plans } = await apiFetch<SeasonPlanListResponse>('/api/plans', { sessionId })
  return plans
}

/**
 * One saved plan with its items.
 *
 * null is 404, which the contract merges with "belongs to another
 * cooperative" on purpose. It does not mean the backend failed: that is
 * rethrown, so a pengurus sees "coba lagi" rather than being told a plan they
 * applied this morning never existed.
 */
export async function loadPlan(
  sessionId: string | null,
  id: string,
): Promise<SeasonPlanResponse | null> {
  try {
    const plan = await apiFetch<SeasonPlanResponse>(`/api/plans/${id}`, { sessionId })
    // Same reason `normaliseProposal` fills its gaps: `member_shares` arrived
    // with the share-token migration, and a plan applied before it — or a
    // backend one deploy behind — sends the field absent. It is mapped over on
    // the detail screen, and `undefined.map` would take the whole plan down
    // over a panel that is an addition to it.
    return { ...plan, items: plan.items ?? [], member_shares: plan.member_shares ?? [] }
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}
