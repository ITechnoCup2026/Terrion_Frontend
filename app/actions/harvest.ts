'use server'

import { revalidatePath } from 'next/cache'

import { toISODate } from '@/lib/agronomy/dates'
import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { apiFetch, ApiError } from '@/lib/api/client'
import type { RecordHarvestResponseRaw } from '@/lib/api/types'
import { toCalibration, type Calibration } from '@/lib/calibration/model'
import { currentSessionId, requireRole } from '@/lib/auth/session'
import { recordHarvestSchema } from '@/lib/schemas/harvest'

/** Why the server refused, in the same words the form would have used. */
const REFUSALS: Record<string, string> = {
  harvest_block_already_gone:
    'Blok ini sudah tidak ada, atau bukan milik koperasi Anda.',
  harvest_already_recorded:
    'Panen blok ini sudah dicatat sebelumnya.',
  harvest_before_planting:
    'Tanggal panen tidak boleh sebelum tanggal tanam.',
  harvest_in_future:
    'Tanggal panen belum terjadi. Catat setelah panen selesai.',
  harvest_payment_before_crop:
    'Tanggal pembayaran tidak boleh sebelum tanggal panen.',
}

export type RecordHarvestOutcome = {
  plotId: string
  blockId: string
  calibration: Calibration | null
}

/**
 * Records what came off a block, and reports back what that taught the model.
 *
 * The calibration comes back with the confirmation rather than being left for
 * the reader to find on the dashboard later. The person who just typed a yield
 * is the one who should see that their entry moved the next prediction --
 * anywhere else it is a statistic, here it is a receipt.
 */
export async function recordHarvest(
  raw: unknown,
): Promise<ActionResult<RecordHarvestOutcome>> {
  return attempt(async () => {
    await requireRole(['kader', 'pengurus'])

    const parsed = recordHarvestSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }

    const { blockId, harvestDate, yieldKg, pricePerKg, paymentDate } = parsed.data
    const sessionId = await currentSessionId()

    try {
      const result = await apiFetch<RecordHarvestResponseRaw>(
        `/api/blocks/${blockId}/harvest`,
        {
          method: 'PATCH',
          sessionId,
          body: {
            actual_harvest_date: toISODate(harvestDate),
            actual_yield_kg: yieldKg,
            actual_price_per_kg: pricePerKg ?? null,
            payment_received_date: paymentDate ? toISODate(paymentDate) : null,
          },
        },
      )
      // A recorded harvest retires the block from the canvas and moves the
      // cooperative's calibration, so the farm, the list and the dashboard
      // that reads those figures are all drawn from stale output without this.
      revalidatePath(`/plots/${result.plot_id}`)
      revalidatePath('/plots')
      revalidatePath('/dashboard')

      return {
        plotId: result.plot_id,
        blockId: result.block_id,
        calibration: result.calibration ? toCalibration(result.calibration) : null,
      }
    } catch (error) {
      if (error instanceof ApiError && REFUSALS[error.code]) {
        throw new ExpectedFailure(REFUSALS[error.code])
      }
      throw error
    }
  })
}
