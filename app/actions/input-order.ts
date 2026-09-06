'use server'

import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { apiFetch, ApiError } from '@/lib/api/client'
import type {
  CreateInputOrderBodyRaw,
  CreateInputOrderResponseRaw,
} from '@/lib/api/types'
import { currentSessionId, requireRole } from '@/lib/auth/session'
import { createInputOrderSchema, updateOrderStatusSchema } from '@/lib/schemas/input-order'

/**
 * Why the server refused, in the same words the screen would have used.
 *
 * Every one of these is something a pengurus did that they can undo, so the
 * message travels to the browser unchanged. Anything not listed here is a bug
 * and gets the generic sentence from lib/actions/result.ts instead.
 */
const REFUSALS: Record<string, string> = {
  rdkk_nothing_to_order:
    'Tidak ada kebutuhan pupuk untuk dipesan musim ini.',
  order_season_already_open:
    'Sudah ada pesanan kelompok untuk musim ini. Selesaikan atau batalkan pesanan itu '
    + 'sebelum membuat yang baru.',
  order_not_found:
    'Pesanan ini sudah tidak ada, atau bukan milik koperasi Anda.',
  order_already_final:
    'Pesanan ini sudah selesai atau dibatalkan, jadi statusnya tidak bisa diubah lagi.',
  // Far more often two pengurus with the same page open than a wrong button:
  // one of them moved the order first. Hence "muat ulang", not an accusation.
  order_transition_invalid:
    'Status pesanan ini sudah berubah sejak halaman dibuka. Muat ulang halaman, lalu coba lagi.',
  order_line_unknown:
    'Ada pupuk yang tidak termasuk kebutuhan musim ini. Muat ulang halaman, lalu coba lagi.',
  order_lines_empty:
    'Semua jumlah disetel ke nol, jadi tidak ada yang bisa dipesan. Isi minimal satu pupuk, '
    + 'atau jangan buat pesanan.',
}

/**
 * The interim answer while the backend has not shipped these endpoints yet.
 *
 * A 404 or 405 here is not a missing order and not a broken system -- it is
 * this app asking for a route that does not exist on the server it is talking
 * to. The generic "Terjadi kesalahan di sistem" would send a pengurus looking
 * for a fault that is not theirs and cannot be fixed from where they are
 * standing. Remove this once the backend is deployed: from then on a 404 on
 * PATCH really does mean the order is gone, and `order_not_found` says so.
 */
function backendMissingTheRoute(error: ApiError): boolean {
  return error.code === 'http_404' || error.code === 'http_405'
}

function refuse(error: unknown): never {
  if (error instanceof ApiError) {
    const message = REFUSALS[error.code]
    if (message) throw new ExpectedFailure(message)
    if (backendMissingTheRoute(error)) {
      throw new ExpectedFailure(
        'Fitur ini belum aktif di server. Data pesanan tetap aman — hubungi pengelola '
        + 'Terrion untuk mengaktifkannya.',
      )
    }
  }
  throw error
}

/**
 * Turns this season's aggregated requirement into a draft order.
 *
 * `lines` carries the adjusted amounts when a pengurus changed them, and is
 * omitted when they did not -- an absent body orders the RDKK exactly as
 * aggregated. The server stores the RDKK's own figure beside any adjusted one,
 * so an order whose numbers differ from the printed form says so on its face
 * rather than differing silently.
 */
export async function createInputOrder(
  raw?: unknown,
): Promise<ActionResult<{ orderId: string; lines: number }>> {
  return attempt(async () => {
    await requireRole(['pengurus'])
    const parsed = createInputOrderSchema.safeParse(raw ?? {})
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }
    const sessionId = await currentSessionId()

    const body: CreateInputOrderBodyRaw | undefined = parsed.data.lines
      ? { lines: parsed.data.lines.map(line => ({ item: line.item, quantity: line.quantity })) }
      : undefined

    try {
      const result = await apiFetch<CreateInputOrderResponseRaw>('/api/input-orders', {
        method: 'POST',
        sessionId,
        body,
      })
      return { orderId: result.order_id, lines: result.lines }
    } catch (error) {
      refuse(error)
    }
  })
}

/**
 * Records that an order moved: to the distributor, to received, or to off.
 *
 * Nothing here contacts a supplier -- there is no supplier to contact.
 * Subsidised fertiliser is procured on paper, at a kiosk, verified by a
 * penyuluh, through the government's own e-RDKK. This app produces the form a
 * person carries there, so a status is a note about the world outside it, and
 * a pengurus is the only role that may write one on the cooperative's behalf.
 */
export async function updateInputOrderStatus(raw: unknown): Promise<ActionResult<void>> {
  return attempt(async () => {
    await requireRole(['pengurus'])
    const parsed = updateOrderStatusSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }
    const { orderId, status } = parsed.data
    const sessionId = await currentSessionId()

    try {
      await apiFetch<void>(`/api/input-orders/${orderId}`, {
        method: 'PATCH',
        sessionId,
        body: { status },
      })
    } catch (error) {
      refuse(error)
    }
  })
}
