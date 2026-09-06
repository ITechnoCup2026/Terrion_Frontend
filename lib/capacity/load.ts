import { apiFetch } from '@/lib/api/client'
import { currentSessionId } from '@/lib/auth/session'

/**
 * How much of one commodity the cooperative can absorb in a week.
 *
 * `tonnesPerWeek` is null when nobody has measured it. That is not the same as
 * zero, and the difference is load-bearing: with a figure, the collision
 * detector flags a week against the warehouse; without one it falls back to
 * median x 2,5. A zero would flag every week that holds anything at all.
 */
export type CapacityRow = {
  commodityId: string
  commodityName: string
  tonnesPerWeek: number | null
}

type CapacityResponseRaw = {
  rows: {
    commodity_id: string
    commodity_name: string
    tonnes_per_week: number | null
  }[]
}

/** Every reference commodity, whether or not this cooperative has set a figure. */
export async function loadCapacity(): Promise<CapacityRow[]> {
  const response = await apiFetch<CapacityResponseRaw>('/api/capacity', {
    sessionId: await currentSessionId(),
  })

  return response.rows.map(row => ({
    commodityId: row.commodity_id,
    commodityName: row.commodity_name,
    tonnesPerWeek: row.tonnes_per_week,
  }))
}
