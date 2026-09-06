import { TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { formatNumberId } from '@/lib/format/number'
import type {
  CommodityThresholdResponse, PlanFlaggedWeekResponse,
} from '@/lib/planning/types'
import { formatIsoWeek } from '@/lib/planning/week'

/**
 * What "menumpuk" is measured against, and which weeks went over it.
 *
 * `flagged_weeks` on a card is a count with no denominator: three weeks over
 * *what*? The thresholds are the denominator, and the backend sends the basis
 * of each one — the cooperative's own holding capacity where it is known, a
 * default where it is not. A pengurus who can see that the ceiling is a
 * default rather than their warehouse knows how much to trust the flag, and
 * that is a judgement this screen is not entitled to make for them.
 *
 * The weeks are listed one row each rather than summarised. "3 minggu
 * menumpuk" is a statistic; "18–24 Jan, jagung, 14,2 t terhadap 10,0 t" is
 * something a pengurus can act on by moving one planting date.
 */
export function CapacityThresholds({
  thresholds,
  flagged,
  commodities,
}: {
  thresholds: CommodityThresholdResponse[]
  flagged: PlanFlaggedWeekResponse[]
  /** Commodity id → name. Ids are printed as-is when the catalogue lacks one. */
  commodities: Record<string, string>
}) {
  if (thresholds.length === 0 && flagged.length === 0) return null

  const name = (id: string) => commodities[id] ?? id

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-xs font-semibold text-foreground">Ambang penumpukan per komoditas</h4>
        {flagged.length === 0
          ? <Badge tone="positive">Tidak ada minggu yang lewat</Badge>
          : <Badge tone="warning">{formatNumberId(flagged.length, 0)} minggu lewat ambang</Badge>}
      </div>

      {thresholds.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {thresholds.map(t => (
            <li key={t.commodity_id} className="text-[0.6875rem] leading-snug">
              <span className="font-medium text-foreground">{name(t.commodity_id)}</span>
              <span className="tabular-nums text-foreground/90">
                {' '}{formatNumberId(t.tonnes_per_week)} t/minggu
              </span>
              <span className="text-muted-foreground"> · {t.basis}</span>
            </li>
          ))}
        </ul>
      )}

      {flagged.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-border/70 pt-2.5">
          {flagged.map(week => (
            <li
              key={`${week.iso_week}-${week.commodity_id}`}
              className="flex gap-2 text-[0.6875rem] leading-snug"
            >
              <TriangleAlert
                aria-hidden
                className="mt-px size-3.5 shrink-0 text-[var(--terrion-gold-600)]"
              />
              <span>
                <span className="font-medium text-foreground">{formatIsoWeek(week.iso_week)}</span>
                <span className="text-muted-foreground"> · {name(week.commodity_id)} · </span>
                <span className="tabular-nums text-foreground/90">
                  {formatNumberId(week.tonnes)} t
                </span>
                <span className="text-muted-foreground">
                  {' '}terhadap ambang {formatNumberId(week.threshold_tonnes)} t ({week.basis})
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
