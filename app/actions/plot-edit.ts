'use server'

import { revalidatePath } from 'next/cache'

import { toISODate } from '@/lib/agronomy/dates'
import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { apiFetch, ApiError } from '@/lib/api/client'
import { currentSessionId, requireRole } from '@/lib/auth/session'
import { deletePlotSchema, updateBlockSchema } from '@/lib/schemas/plot-edit'

/**
 * Why the server refused, in the words the screen would have used.
 *
 * Both refusals are facts about the cooperative's own records rather than
 * faults, so they travel to the browser unchanged and are drawn beside the
 * form. `edit_block_harvested` in particular is the system protecting its own
 * calibration, and saying so is more useful than "gagal menyimpan".
 */
const REFUSALS: Record<string, string> = {
  edit_block_already_gone:
    'Blok ini sudah tidak ada, atau bukan milik koperasi Anda. Muat ulang halaman.',
  edit_block_harvested:
    'Blok ini sudah dipanen, jadi tidak bisa diubah lagi. Catatan panennya sudah dipakai '
    + 'untuk mengkalibrasi perkiraan koperasi.',
  delete_plot_already_gone:
    'Lahan ini sudah tidak ada, atau bukan milik koperasi Anda.',
  delete_plot_harvested:
    'Lahan ini punya panen yang sudah tercatat, jadi tidak bisa dihapus. Riwayat panen '
    + 'adalah catatan yang sudah dipakai model, bukan sesuatu yang bisa ditarik kembali.',
}

export async function updateBlock(raw: unknown): Promise<ActionResult<{ plotId: string }>> {
  return attempt(async () => {
    await requireRole(['kader', 'pengurus'])

    const parsed = updateBlockSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }
    const { blockId, plotId, areaHa, varietyId, plantingDate } = parsed.data

    try {
      await apiFetch<null>(`/api/blocks/${blockId}`, {
        method: 'PATCH',
        sessionId: await currentSessionId(),
        body: {
          area_ha: areaHa,
          variety_id: varietyId,
          planting_date: toISODate(plantingDate),
        },
      })
    } catch (error) {
      if (error instanceof ApiError && REFUSALS[error.code]) {
        throw new ExpectedFailure(REFUSALS[error.code])
      }
      throw error
    }

    revalidatePath(`/plots/${plotId}`)
    revalidatePath('/plots')
    revalidatePath('/dashboard')

    return { plotId }
  })
}

export async function deletePlot(raw: unknown): Promise<ActionResult<null>> {
  return attempt(async () => {
    // Deleting a whole registration is the pengurus's call, not the kader's.
    await requireRole(['pengurus'])

    const parsed = deletePlotSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }

    try {
      await apiFetch<null>(`/api/plots/${parsed.data.plotId}`, {
        method: 'DELETE',
        sessionId: await currentSessionId(),
      })
    } catch (error) {
      if (error instanceof ApiError && REFUSALS[error.code]) {
        throw new ExpectedFailure(REFUSALS[error.code])
      }
      throw error
    }

    revalidatePath('/plots')
    revalidatePath('/dashboard')

    return null
  })
}
