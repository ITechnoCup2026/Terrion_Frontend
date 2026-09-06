import { z } from 'zod'

/**
 * The cooperative's weekly absorption, per commodity.
 *
 * An empty field is not zero. It means nobody has measured this commodity's
 * warehouse, and the collision detector must go back to its median fallback
 * rather than flag every week that holds anything. So the form sends `null`,
 * and the API deletes the row — which is a different act from storing 0, and
 * the database refuses 0 anyway (`check tonnes_per_week > 0`).
 *
 * The upper bound is a typo guard, not an agronomic claim: a cooperative
 * absorbing more than 100.000 t in a week is someone who left the decimal out.
 */
export const MAX_TONNES_PER_WEEK = 100_000

export const capacityRowSchema = z.object({
  commodityId: z.uuid(),
  tonnesPerWeek: z
    .union([z.literal(''), z.coerce.number()])
    .transform(value => (value === '' ? null : Number(value)))
    .refine(
      value => value === null || (value > 0 && value <= MAX_TONNES_PER_WEEK),
      `Isi lebih dari 0 dan paling banyak ${MAX_TONNES_PER_WEEK}, atau kosongkan.`,
    )
    .nullable(),
})

export const setCapacitySchema = z.object({
  rows: z.array(capacityRowSchema).min(1, 'Tidak ada yang disimpan.'),
})

export type SetCapacityInput = z.infer<typeof setCapacitySchema>
