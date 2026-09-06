/**
 * How a group order's status is written, and what a pengurus may do about it.
 *
 * The words here are chosen to describe recording rather than deciding. This
 * app does not approve a fertiliser order and cannot deliver one: subsidised
 * fertiliser is procured on paper, at a kiosk, verified by a penyuluh, through
 * the government's own e-RDKK. What Terrion produces is the form a person
 * carries there.
 *
 * So the buttons say "tandai" -- mark -- not "kirim" or "setujui". An app that
 * claims to submit an order it never submits, or to approve one it has no
 * authority over, is lying about its own reach, and the first person to notice
 * is the pengurus who took it at its word.
 *
 * `completed` is written "Pupuk diterima" for the same reason: "Selesai" left
 * it ambiguous whether the fertiliser had arrived or merely been paid for, and
 * Terrion never touches money.
 */

import type { InputOrderStatusRaw } from '@/lib/api/types'

export type OrderStatus = InputOrderStatusRaw

/** A status that may still be acted on, versus one whose record is closed. */
export type MovableStatus = Exclude<OrderStatus, 'draft'>

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Draf',
  submitted: 'Sudah diajukan',
  completed: 'Pupuk diterima',
  cancelled: 'Dibatalkan',
}

export const ORDER_STATUS_TONE: Record<OrderStatus, 'neutral' | 'positive' | 'warning'> = {
  draft: 'neutral',
  submitted: 'warning',
  completed: 'positive',
  cancelled: 'neutral',
}

/** What each status means for the berkas, in one sentence, for the reader who
 *  has not been told what any of this is. */
export const ORDER_STATUS_MEANING: Record<OrderStatus, string> = {
  draft: 'Belum dibawa ke mana-mana. Cetak RDKK-nya, lalu bawa ke distributor.',
  submitted: 'Formulir sudah diserahkan ke distributor. Tunggu pupuknya datang.',
  completed: 'Pupuk sudah diterima koperasi. Berkas ini selesai.',
  cancelled: 'Pesanan ini dibatalkan dan tidak dilanjutkan.',
}

/** The button for one step, and the sentence under it. */
export type OrderAction = {
  to: MovableStatus
  label: string
  /** Why a pengurus would press it, in their own terms. */
  hint: string
  /** Ends the order for good, so it is confirmed once before it runs. */
  destructive: boolean
}

const ACTIONS: Record<MovableStatus, OrderAction> = {
  submitted: {
    to: 'submitted',
    label: 'Tandai sudah diajukan',
    hint: 'Formulir RDKK sudah diserahkan ke distributor atau kios resmi.',
    destructive: false,
  },
  completed: {
    to: 'completed',
    label: 'Tandai pupuk diterima',
    hint: 'Pupuknya sudah sampai di koperasi.',
    destructive: false,
  },
  cancelled: {
    to: 'cancelled',
    label: 'Batalkan pesanan',
    hint: 'Salah hitung, musim berubah, atau pengajuannya tidak dilanjutkan.',
    destructive: true,
  },
}

/**
 * What may follow a status, worked out here.
 *
 * The server owns this rule and answers it in `next_statuses`. This copy
 * exists for exactly one case: a backend that predates the field and sends no
 * answer at all. Without it the screen would render zero buttons and say
 * nothing, which reads as "the feature was never built" rather than "the
 * server has not caught up yet".
 *
 * It is a fallback, never an override -- an empty list from the server is a
 * real answer, and means the order is finished.
 */
export function fallbackNextStatuses(status: OrderStatus): OrderStatus[] {
  if (status === 'draft') return ['submitted', 'cancelled']
  if (status === 'submitted') return ['completed', 'cancelled']
  return []
}

/**
 * The steps offered for an order, from the list the server supplied.
 *
 * The rules live on the server -- there is one transition table, in Go -- and
 * this only dresses its answer. Anything the server does not offer is not
 * shown, so the two cannot drift into a screen that renders a button the API
 * will refuse.
 */
export function orderActions(nextStatuses: readonly OrderStatus[]): OrderAction[] {
  const actions: OrderAction[] = []
  for (const status of nextStatuses) {
    if (status === 'draft') continue
    const action = ACTIONS[status]
    if (action) actions.push(action)
  }
  // Cancelling is the way out, never the obvious next step, so it sits last
  // however the server happened to order the list.
  return actions.sort((a, b) => Number(a.destructive) - Number(b.destructive))
}

/**
 * True when any line was ordered at something other than what the RDKK said.
 *
 * Shaped structurally rather than taking an `InputOrder`, because that type
 * lives in load.ts beside the session cookie: importing a value from there
 * would pull server-only code into the browser bundle, which is exactly what
 * the build refused when this function first lived over there.
 */
export function isAdjusted(
  order: { lines: readonly { quantityRdkk: number | null }[] },
): boolean {
  return order.lines.some(line => line.quantityRdkk !== null)
}

/** True while an order still counts against "one live order per season". */
export function isOrderOpen(status: OrderStatus): boolean {
  return status === 'draft' || status === 'submitted'
}
