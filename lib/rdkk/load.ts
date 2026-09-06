import { utcDate } from '@/lib/agronomy/dates'
import { apiFetch } from '@/lib/api/client'
import type { InputOrderRaw, InputOrderStatusRaw, RdkkResponseRaw } from '@/lib/api/types'
import { currentSessionId } from '@/lib/auth/session'
import { fallbackNextStatuses } from '@/lib/rdkk/status'

export type Season = { label: string; start: Date; end: Date }

export type RdkkRow = {
  memberId: string
  memberName: string
  plantedHa: number
  /** One entry per column in `RdkkSeason.columns`, null where this member needs none of it. */
  quantitiesKg: (number | null)[]
  overSubsidyCap: boolean
  excessHa: number
}

/**
 * GET /api/rdkk already returns the print-ready document -- aggregated,
 * gridded to one column per input item, sources included -- so this is a
 * straight field rename rather than a re-aggregation. aggregateInputs() and
 * buildRdkkDocument() stay in the repo (tested, pure) but nothing calls them
 * anymore: the backend now does what they used to.
 */
export type RdkkSeason = {
  meta: {
    cooperativeName: string
    village: string
    district: string
    province: string
    seasonLabel: string
    seasonStart: Date
    seasonEnd: Date
    printedAt: Date
  }
  columns: string[]
  rows: RdkkRow[]
  /** One entry per column, aligned with `columns` by construction. */
  totals: number[]
  /** Every rate document behind the numbers, distinct and sorted. */
  sources: string[]
  memberCount: number
  totalPlantedHa: number
  membersOverCap: number
  commoditiesWithoutRates: string[]
  subsidyCapHa: number
}

export async function loadSeasonInputs(season: Season): Promise<RdkkSeason> {
  const sessionId = await currentSessionId()
  const raw = await apiFetch<RdkkResponseRaw>('/api/rdkk', {
    sessionId,
    query: {
      from: season.start.toISOString().slice(0, 10),
      to: season.end.toISOString().slice(0, 10),
      label: season.label,
    },
  })

  return {
    meta: {
      cooperativeName: raw.meta.cooperative_name,
      village: raw.meta.village,
      district: raw.meta.district,
      province: raw.meta.province,
      seasonLabel: raw.meta.season_label,
      seasonStart: utcDate(raw.meta.season_start),
      seasonEnd: utcDate(raw.meta.season_end),
      printedAt: new Date(raw.meta.printed_at),
    },
    columns: raw.columns,
    rows: raw.rows.map(r => ({
      memberId: r.member_id,
      memberName: r.member_name,
      plantedHa: r.planted_ha,
      quantitiesKg: r.quantities_kg,
      overSubsidyCap: r.over_subsidy_cap,
      excessHa: r.excess_ha,
    })),
    totals: raw.totals,
    sources: raw.sources,
    memberCount: raw.member_count,
    totalPlantedHa: raw.total_planted_ha,
    membersOverCap: raw.members_over_cap,
    commoditiesWithoutRates: raw.commodities_without_rates,
    subsidyCapHa: raw.subsidy_cap_ha,
  }
}

export type InputOrderLine = {
  item: string
  quantity: number
  unit: string
  /** The RDKK's own figure, present only where this line was adjusted. */
  quantityRdkk: number | null
}

export type InputOrder = {
  id: string
  seasonLabel: string
  status: InputOrderStatusRaw
  createdAt: Date
  createdByName: string | null
  statusChangedAt: Date | null
  statusChangedByName: string | null
  /** Where this order may go next, as the server ruled. Empty on a finished
   *  one. The screen renders a button per entry rather than keeping a second
   *  copy of the transition rules that could drift from the server's. */
  nextStatuses: InputOrderStatusRaw[]
  lines: InputOrderLine[]
}


/** GET /api/input-orders, newest first: every group order this cooperative has
 *  created, with its status, who made it, and who last moved it. */
export async function loadInputOrders(): Promise<InputOrder[]> {
  const sessionId = await currentSessionId()
  const raw = await apiFetch<InputOrderRaw[]>('/api/input-orders', { sessionId })
  return raw.map(order => ({
    id: order.id,
    seasonLabel: order.season_label,
    status: order.status,
    // A full RFC3339 timestamp, not the plain 'YYYY-MM-DD' utcDate() parses.
    createdAt: new Date(order.created_at),
    createdByName: order.created_by_name,
    // Null until somebody moves it, and null is not a date: an order nobody
    // has touched has no change to show, not a change at the epoch.
    statusChangedAt: order.status_changed_at ? new Date(order.status_changed_at) : null,
    statusChangedByName: order.status_changed_by_name,
    // Absent and empty mean different things. A backend that predates this
    // field says nothing, and the screen still has to offer the steps; a
    // backend that sends [] is saying the order is finished.
    nextStatuses: order.next_statuses ?? fallbackNextStatuses(order.status),
    lines: order.lines.map(line => ({
      item: line.item,
      quantity: line.quantity,
      unit: line.unit,
      quantityRdkk: line.quantity_rdkk,
    })),
  }))
}

/** `RdkkSeason.columns`/`.totals` as the `{inputItem, quantityKg}` pairs
 *  toOrderLines() and GroupPurchaseAlert expect, dropping empty columns. */
export function seasonRequirementLines(
  season: Pick<RdkkSeason, 'columns' | 'totals' | 'sources'>,
): { inputItem: string; quantityKg: number; sources: string[] }[] {
  return season.columns
    .map((inputItem, i) => ({ inputItem, quantityKg: season.totals[i], sources: season.sources }))
    .filter(line => line.quantityKg > 0)
}
