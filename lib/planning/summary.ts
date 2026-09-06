import { utcDate } from '@/lib/agronomy/dates'
import { MONTHS_ID } from '@/lib/harvest/format'

import type { SeasonPlanItemResponse } from './types'

/**
 * What a saved plan adds up to.
 *
 * `GET /api/plans/:id` sends items and no metrics at all — the proposal screen
 * gets `PlanMetricsResponse`, a stored plan does not. That is a deliberate
 * asymmetry in the contract, not an oversight: the moment a plan is applied,
 * the blocks behind it become the dashboard's business, and the dashboard is
 * where peaks, collisions and capacity are computed from the real weekly
 * buckets.
 *
 * So this file draws a hard line, and every function below stays on one side
 * of it:
 *
 *   ALLOWED    adding up numbers Go already sent, and grouping rows by a date
 *              Go already chose. Arithmetic, not estimation.
 *   FORBIDDEN  anything that re-derives a modelled quantity — peak week,
 *              collision counts, a capacity verdict, a yield. Those belong to
 *              the engine, and a second implementation in the browser would
 *              drift from it silently.
 *
 * The practical test: if the backend changed its yield model tomorrow, nothing
 * here would need to change. That is what makes these figures safe to print
 * beside figures Go computed.
 */

export type PlanTotals = {
  /** One per assignment, which is one per plot. */
  plots: number
  members: number
  commodities: number
  areaHa: number
  /** The sum of the mid estimates — the same figure the table's foot prints. */
  tonnesMid: number
  /** Sum of every row's low bound: the season where each plot disappoints. */
  tonnesLow: number
  /** Sum of every row's high bound. */
  tonnesHigh: number
  /** Rows whose planting block still stands. */
  liveBlocks: number
  /** Rows the model itself is unsure about. */
  doubtful: number
  /** Rows whose window is early or late, but not doubtful. */
  offWindow: number
}

export function planTotals(items: readonly SeasonPlanItemResponse[]): PlanTotals {
  const totals: PlanTotals = {
    plots: items.length,
    members: new Set(items.map(i => i.member_id)).size,
    commodities: new Set(items.map(i => i.commodity_id)).size,
    areaHa: 0,
    tonnesMid: 0,
    tonnesLow: 0,
    tonnesHigh: 0,
    liveBlocks: 0,
    doubtful: 0,
    offWindow: 0,
  }

  for (const item of items) {
    totals.areaHa += item.area_ha
    totals.tonnesMid += item.tonnes_mid
    totals.tonnesLow += item.tonnes_low
    totals.tonnesHigh += item.tonnes_high
    if (item.block_id !== null) totals.liveBlocks += 1
    if (item.plausibility === 'implausible') totals.doubtful += 1
    else if (item.plausibility === 'early' || item.plausibility === 'late') totals.offWindow += 1
  }

  return totals
}

export type HarvestMonth = {
  /** "2027-03", for keys and ordering. */
  key: string
  /** "Mar 2027". */
  label: string
  /** Sum of mid estimates for windows opening in this month. */
  tonnesMid: number
  plots: number
}

/**
 * When the plan's harvest lands, month by month.
 *
 * Bucketed by the *start* of each window, which is a simplification worth
 * naming: a window that opens on 28 February and closes on 13 March is counted
 * whole in February. Splitting it would mean deciding how tonnage distributes
 * inside a window, and that is a model — the forbidden side of the line above.
 * The screen says "menurut awal jendela panen" for exactly this reason.
 *
 * Empty months between the first and the last are returned as zeroes rather
 * than skipped. A month missing from the strip would read as "no data", which
 * is a different claim from "nothing ripens in January" — and telling those
 * apart is the whole point of spreading a harvest.
 */
export function harvestByMonth(items: readonly SeasonPlanItemResponse[]): HarvestMonth[] {
  if (items.length === 0) return []

  const buckets = new Map<string, HarvestMonth>()

  for (const item of items) {
    const start = utcDate(item.harvest_start)
    const key = monthKey(start)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.tonnesMid += item.tonnes_mid
      bucket.plots += 1
    } else {
      buckets.set(key, { key, label: monthLabel(start), tonnesMid: item.tonnes_mid, plots: 1 })
    }
  }

  const keys = [...buckets.keys()].sort()
  const out: HarvestMonth[] = []

  for (
    let cursor = fromMonthKey(keys[0]);
    monthKey(cursor) <= keys[keys.length - 1];
    cursor = nextMonth(cursor)
  ) {
    const key = monthKey(cursor)
    out.push(buckets.get(key) ?? { key, label: monthLabel(cursor), tonnesMid: 0, plots: 0 })
  }

  return out
}

export type CommodityShare = {
  commodityId: string
  commodityName: string
  plots: number
  areaHa: number
  tonnesMid: number
}

/**
 * What the plan grows, largest tonnage first.
 *
 * A season plan is read twice: once as "who plants what" — that is the table —
 * and once as "what does this cooperative become next season", which no table
 * of 47 rows answers. Three crops in a rough ratio is the second reading, and
 * it is the one a buyer conversation starts from.
 */
export function commodityBreakdown(items: readonly SeasonPlanItemResponse[]): CommodityShare[] {
  const byCommodity = new Map<string, CommodityShare>()

  for (const item of items) {
    const row = byCommodity.get(item.commodity_id)
    if (row) {
      row.plots += 1
      row.areaHa += item.area_ha
      row.tonnesMid += item.tonnes_mid
    } else {
      byCommodity.set(item.commodity_id, {
        commodityId: item.commodity_id,
        commodityName: item.commodity_name,
        plots: 1,
        areaHa: item.area_ha,
        tonnesMid: item.tonnes_mid,
      })
    }
  }

  return [...byCommodity.values()].sort((a, b) => b.tonnesMid - a.tonnesMid)
}

/** "2027-03". Sortable as a string, which is why the month is padded. */
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(d: Date): string {
  return `${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function fromMonthKey(key: string): Date {
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1))
}

function nextMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
}
