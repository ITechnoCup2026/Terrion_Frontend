import { z } from 'zod'

/**
 * What a group order may be asked to become, and what may be ordered.
 *
 * Shared by the buttons in PurchasesView and the Server Actions behind them,
 * so both agree on what is possible. Note what is absent from the status enum:
 * `draft`. A pengurus records that a form reached the distributor, or that the
 * fertiliser arrived, or that the whole thing is off -- there is no step that
 * un-submits an order, because handing paper to a kiosk is not undone by
 * clicking in an app. The schema gives that step nowhere to be expressed,
 * which is the same reason respondToRequestSchema has no `pending`.
 *
 * The season, the cooperative and the items all come from the server. A body
 * that could name its own season would be ordering against a requirement
 * nobody aggregated.
 */
export const updateOrderStatusSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(['submitted', 'completed', 'cancelled']),
})

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>

/**
 * An adjusted amount, in whole sacks.
 *
 * Adjusting is a real decision -- a cooperative that cannot afford the full
 * requirement orders what it can -- so it is sent to the server and stored,
 * rather than being a number that only ever existed in the browser. The
 * server keeps the RDKK's own figure beside it, and refuses an item this
 * season never asked for.
 *
 * Whole sacks only: fertiliser is not sold by the part sack, and a fractional
 * order line is one a distributor cannot fill.
 */
export const createOrderLineSchema = z.object({
  item: z.string().min(1, 'Pupuk tidak dikenali'),
  quantity: z.coerce
    .number()
    .int('Jumlah karung harus bilangan bulat')
    .min(0, 'Jumlah karung tidak boleh negatif')
    .max(1_000_000),
})

export const createInputOrderSchema = z.object({
  /** Omitted entirely when nothing was adjusted: order the RDKK as it stands. */
  lines: z.array(createOrderLineSchema).optional(),
})

export type CreateInputOrderInput = z.infer<typeof createInputOrderSchema>
