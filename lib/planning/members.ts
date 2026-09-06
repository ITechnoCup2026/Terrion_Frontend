import { SUBSIDY_CAP_HA } from '@/lib/rdkk/aggregate'

import type { OverSubsidyCapResponse } from './types'

/**
 * Which members a plan would push past the subsidised-fertiliser ceiling.
 *
 * Indonesia caps subsidised fertiliser per farmer, not per plot and not per
 * cooperative, and a pengurus who learns that only when the RDKK form is
 * printed learns it too late — the season is already planted. The plan is the
 * moment the cap is still a choice, so the card says it there.
 *
 * Two rules make this honest enough to sit next to figures Go computed:
 *
 *   - It invents nothing. Every hectare here is `area_ha` as the backend sent
 *     it; the only arithmetic is addition, which is why this may live in the
 *     browser while every projected tonne may not.
 *   - It uses the cooperative's one cap, imported from `lib/rdkk/aggregate`
 *     rather than retyped, so this screen and the RDKK sheet can never
 *     disagree about who is over. That constant mirrors `constants.SubsidyCapHa`
 *     in Go.
 *
 * Flagged, never truncated — the same stance `lib/rdkk/aggregate.ts` takes. A
 * member over the cap still plants their land; what changes is that the excess
 * is ordered unsubsidised, and somebody has to know that before November.
 */

/**
 * The three fields this needs, named structurally rather than by response type.
 *
 * A proposal's assignment and a saved plan's item are different shapes that
 * agree on exactly these three, and the cap means the same thing on both
 * screens — before the decision and after it. Typing the parameter to either
 * one would have forced a second copy of the rule, which is how two screens
 * start disagreeing about who is over.
 */
export type MemberAreaRow = {
  member_id: string
  member_name: string
  area_ha: number
}

export type MemberArea = {
  memberId: string
  memberName: string
  /** Total hectares this plan assigns to the member, across every plot. */
  areaHa: number
  /** Hectares above the cap. Always positive for a returned row. */
  excessHa: number
}

/**
 * Members whose assigned area exceeds the cap, largest overshoot first.
 *
 * Exactly at the cap is not over it — the same boundary Go tests for, so two
 * hectares even stays eligible on both screens.
 */
export function membersOverSubsidyCap(
  rows: readonly MemberAreaRow[],
  cap: number = SUBSIDY_CAP_HA,
): MemberArea[] {
  const byMember = new Map<string, MemberArea>()

  for (const a of rows) {
    const row = byMember.get(a.member_id)
    if (row) {
      row.areaHa += a.area_ha
    } else {
      byMember.set(a.member_id, {
        memberId: a.member_id,
        memberName: a.member_name,
        areaHa: a.area_ha,
        excessHa: 0,
      })
    }
  }

  return [...byMember.values()]
    .filter(m => m.areaHa > cap)
    .map(m => ({ ...m, excessHa: m.areaHa - cap }))
    .sort((a, b) => b.excessHa - a.excessHa)
}

/**
 * The backend's own over-cap list, in the shape the note already renders.
 *
 * The planner computes this itself now (`over_subsidy_cap` on each candidate
 * plan), and where it does, its list wins: it is the same cap applied to the
 * same areas by the process that will actually write the blocks. The local
 * sum stays for the saved-plan screen, whose items carry no such field, and as
 * the fallback in lib/planning/load.ts for a backend that predates it.
 *
 * Sorted the same way as the local computation — largest overshoot first — so
 * the pengurus reads the same order before and after applying.
 */
export function fromOverSubsidyCap(rows: readonly OverSubsidyCapResponse[]): MemberArea[] {
  return rows
    .map(r => ({
      memberId: r.member_id,
      memberName: r.member_name,
      areaHa: r.planted_ha,
      excessHa: r.excess_ha,
    }))
    .sort((a, b) => b.excessHa - a.excessHa)
}
