import { z } from 'zod'

import { MAX_PLOT_HA, MIN_PLANTING_HA } from './plot'

/**
 * Correcting what is already on record.
 *
 * The form is prefilled from the block's current state and sends the whole
 * state back, so this is not a patch of changed fields — it is what the block
 * should now be. That makes the failure mode obvious to read: whatever is in
 * the form is what will be stored.
 *
 * The server refuses a harvested block outright, and so would this if it could
 * see the harvest; it cannot, so the refusal arrives as `edit_block_harvested`
 * and the form draws it beside the button.
 */
export const updateBlockSchema = z.object({
  blockId:      z.uuid(),
  /** Carried so the action can revalidate the right farm page. */
  plotId:       z.uuid(),
  areaHa:       z.coerce.number()
    .min(MIN_PLANTING_HA, 'Luas harus lebih dari 0')
    .max(MAX_PLOT_HA, `Luas maksimal ${MAX_PLOT_HA} ha`),
  varietyId:    z.uuid('Pilih varietas'),
  plantingDate: z.coerce.date(),
})

export const deletePlotSchema = z.object({
  plotId: z.uuid(),
})

export type UpdateBlockInput = z.infer<typeof updateBlockSchema>
