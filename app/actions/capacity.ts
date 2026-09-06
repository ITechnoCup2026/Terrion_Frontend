'use server'

import { revalidatePath } from 'next/cache'

import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { apiFetch, ApiError } from '@/lib/api/client'
import { currentSessionId, requireRole } from '@/lib/auth/session'
import { setCapacitySchema } from '@/lib/schemas/capacity'

/**
 * Writes the whole capacity table in one request.
 *
 * The screen is one form, so it saves as one form: a per-row save would let
 * half the thresholds land and half fail, leaving the cooperative reading its
 * own weeks against a table nobody chose.
 */
export async function saveCapacity(raw: unknown): Promise<ActionResult<null>> {
  return attempt(async () => {
    await requireRole(['pengurus'])

    const parsed = setCapacitySchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }

    try {
      await apiFetch<null>('/api/capacity', {
        method: 'PUT',
        sessionId: await currentSessionId(),
        body: {
          rows: parsed.data.rows.map(row => ({
            commodity_id: row.commodityId,
            // Empty means "not measured", which the API stores by removing the
            // row -- not by writing a zero.
            tonnes_per_week: row.tonnesPerWeek ?? null,
          })),
        },
      })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'capacity_commodity_unknown') {
        throw new ExpectedFailure(
          'Ada komoditas yang tidak dikenali. Muat ulang halaman, lalu coba lagi.',
        )
      }
      throw error
    }

    // The threshold every flagged week is judged against just moved.
    revalidatePath('/kapasitas')
    revalidatePath('/dashboard')

    return null
  })
}
