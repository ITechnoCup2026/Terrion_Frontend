import { formatNumberId } from '@/lib/format/number'
import type { FertiliserLineResponse } from '@/lib/planning/types'
import { inputItemLabel } from '@/lib/rdkk/label'
import { KG_PER_SACK } from '@/lib/rdkk/order'

/**
 * What this plan would need in fertiliser, before a single seed is in the
 * ground.
 *
 * This is the RDKK figure arriving at the only moment it can still change
 * anything. By the time the sheet is printed the season is planted and the
 * quantity is a consequence; here it is still an input to the decision, and a
 * plan that needs four tonnes more urea than the cooperative can finance is a
 * plan a pengurus should see the cost of while there are two others on the
 * table.
 *
 * Sacks are shown beside kilograms because that is the unit fertiliser is
 * bought in, rounded up: a part sack is not purchasable, so rounding down
 * would under-order every line.
 *
 * `unrated` is the rule this component exists to keep: a commodity with no
 * rate on file gets a dash and a sentence, never "0 kg". Those are different
 * claims, and printing the second is how a cooperative under-orders for a crop
 * nobody has entered a rate for.
 */
export function FertiliserPlan({
  lines,
  unrated,
  commodities,
}: {
  lines: FertiliserLineResponse[]
  /** Commodity ids with no fertiliser rate. */
  unrated: string[]
  commodities: Record<string, string>
}) {
  if (lines.length === 0 && unrated.length === 0) return null

  const name = (id: string) => commodities[id] ?? id

  return (
    <section className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/30 p-3.5">
      <h4 className="text-xs font-semibold text-foreground">
        Kebutuhan pupuk rencana ini
        <span className="ml-1.5 font-normal text-muted-foreground">dasar RDKK</span>
      </h4>

      {lines.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {lines.map(line => (
            <li key={line.input_item} className="flex items-baseline justify-between gap-3">
              <span className="text-[0.6875rem] leading-snug">
                <span className="font-medium text-foreground">
                  {inputItemLabel(line.input_item)}
                </span>
                {line.sources.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}· {line.sources.map(name).join(', ')}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[0.6875rem] font-semibold tabular-nums text-foreground">
                {formatNumberId(line.quantity_kg, 0)} kg
                <span className="font-normal text-muted-foreground">
                  {' '}· {formatNumberId(Math.ceil(line.quantity_kg / KG_PER_SACK), 0)} sak
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {unrated.length > 0 && (
        <p className="border-t border-border/70 pt-2 text-[0.6875rem] leading-relaxed text-muted-foreground">
          Belum ada tarif pupuk untuk{' '}
          <span className="font-medium text-foreground">
            {unrated.map(name).join(', ')}
          </span>
          , jadi kebutuhannya ditulis <span className="font-semibold">—</span>, bukan 0 kg. Luasnya
          tetap ditanam; angkanya menyusul setelah tarifnya dimasukkan.
        </p>
      )}
    </section>
  )
}
