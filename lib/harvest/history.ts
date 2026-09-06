import { utcDate } from '@/lib/agronomy/dates'
import { apiFetch } from '@/lib/api/client'
import { currentSessionId } from '@/lib/auth/session'

/**
 * One harvest that actually happened.
 *
 * No range and no basis, unlike a projected window: every figure here was typed
 * by somebody standing in the field. Recording a harvest retires the block from
 * the canvas — nothing is growing there any more — and this is where the record
 * stays readable afterwards.
 */
export type HarvestRecord = {
  blockId: string
  blockLabel: string
  plotId: string
  plotName: string
  memberName: string
  commodityName: string
  varietyName: string
  areaHa: number
  plantingDate: Date
  harvestDate: Date
  actualYieldKg: number
  /** Null when the harvest was recorded before a price was known — common. */
  pricePerKg: number | null
  paymentDate: Date | null
}

type HarvestHistoryRaw = {
  records: {
    block_id: string
    block_label: string
    plot_id: string
    plot_name: string
    member_name: string
    commodity_name: string
    variety_name: string
    area_ha: number
    planting_date: string
    harvest_date: string
    actual_yield_kg: number
    price_per_kg: number | null
    payment_date: string | null
  }[]
}

/** Every recorded harvest of the signed-in cooperative, newest first. */
export async function loadHarvestHistory(): Promise<HarvestRecord[]> {
  const response = await apiFetch<HarvestHistoryRaw>('/api/harvests', {
    sessionId: await currentSessionId(),
  })

  return response.records.map(record => ({
    blockId: record.block_id,
    blockLabel: record.block_label,
    plotId: record.plot_id,
    plotName: record.plot_name,
    memberName: record.member_name,
    commodityName: record.commodity_name,
    varietyName: record.variety_name,
    areaHa: record.area_ha,
    plantingDate: utcDate(record.planting_date),
    harvestDate: utcDate(record.harvest_date),
    actualYieldKg: record.actual_yield_kg,
    pricePerKg: record.price_per_kg,
    paymentDate: record.payment_date ? utcDate(record.payment_date) : null,
  }))
}

/** Days between planting and harvest — what the model is calibrated against. */
export function daysToHarvest(record: HarvestRecord): number {
  const ms = record.harvestDate.getTime() - record.plantingDate.getTime()
  return Math.round(ms / 86_400_000)
}

/** Yield per hectare, the figure comparable across plots of different sizes. */
export function yieldPerHa(record: HarvestRecord): number | null {
  if (record.areaHa <= 0) return null
  return record.actualYieldKg / 1000 / record.areaHa
}
