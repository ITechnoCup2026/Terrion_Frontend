import { Badge } from '@/components/ui/Badge'
import { formatNumberId } from '@/lib/format/number'
import { formatRupiah } from '@/lib/format/rupiah'
import type { PlanMetricsResponse } from '@/lib/planning/types'

/**
 * The six figures that separate one candidate plan from another.
 *
 * Three of them carry a rule that is easy to break by accident:
 *
 *   peak_tonnes_worst  is a worst case, not a percentile. "P90" and "90%
 *                      kemungkinan" are wrong here — the distribution behind
 *                      it never reaches this app.
 *   gross_value        rests on a reference-price panel that is still partly
 *                      synthetic, so it is labelled a perkiraan and rendered
 *                      empty rather than as Rp 0 when no panel covers the
 *                      commodity. Principle P3: kosong bukan nol.
 *   flagged_weeks      is the number this whole feature exists to push to
 *                      zero, so it is the one that gets a tone.
 */
function Figure({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'alert' | 'empty'
}) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-medium text-muted-foreground">{label}</dt>
      <dd
        className={
          tone === 'alert'
            ? 'mt-0.5 text-base font-semibold tabular-nums text-[var(--terrion-gold-600)]'
            : tone === 'empty'
              ? 'mt-0.5 text-base font-semibold tabular-nums text-[var(--terrion-ink-faint)]'
              : 'mt-0.5 text-base font-semibold tabular-nums text-foreground'
        }
      >
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-[0.6875rem] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function PlanMetrics({ metrics }: { metrics: PlanMetricsResponse }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Figure
        label="Puncak panen mingguan"
        value={`${formatNumberId(metrics.peak_tonnes_expected)} t`}
        hint="pada musim rata-rata"
      />
      <Figure
        label="Puncak terburuk"
        value={`${formatNumberId(metrics.peak_tonnes_worst)} t`}
        hint="pada musim terburuk"
      />
      <Figure
        label="Total panen semusim"
        value={`${formatNumberId(metrics.total_tonnes_mid)} t`}
        hint="perkiraan tengah"
      />
      <Figure
        label="Permintaan pembeli tertutup"
        value={`${formatNumberId(metrics.demand_covered_kg / 1000)} t`}
        hint="dari permintaan yang sudah masuk"
      />
      <Figure
        label="Perkiraan nilai panen"
        // Principle P3. A commodity with no reference price has no value to
        // report, and "Rp 0" would be a claim rather than a gap.
        value={metrics.gross_value === null ? '—' : formatRupiah(metrics.gross_value)}
        hint={
          metrics.gross_value === null
            ? 'belum ada harga acuan'
            : 'perkiraan, dari harga acuan musiman'
        }
        tone={metrics.gross_value === null ? 'empty' : 'default'}
      />
      <Figure
        label="Minggu di atas kapasitas"
        value={formatNumberId(metrics.flagged_weeks, 0)}
        hint={metrics.flagged_weeks === 0 ? 'tidak ada penumpukan' : 'perlu digeser'}
        tone={metrics.flagged_weeks > 0 ? 'alert' : 'default'}
      />
    </dl>
  )
}

/** The one-glance verdict on a plan, for the top of its card. */
export function CapacityBadge({ flaggedWeeks }: { flaggedWeeks: number }) {
  return flaggedWeeks === 0
    ? <Badge tone="positive">Muat di kapasitas</Badge>
    : <Badge tone="warning">{flaggedWeeks} minggu menumpuk</Badge>
}
