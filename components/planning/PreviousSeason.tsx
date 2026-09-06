import { formatNumberId } from '@/lib/format/number'
import type { PlanMetricsResponse, PreviousSeasonResponse } from '@/lib/planning/types'

/**
 * Last season beside this one, which is the only figure on the screen that
 * actually happened.
 *
 * Every other number here is simulated against a ten-year normal. This one is
 * recorded harvest, and putting it next to the projection is what lets a
 * pengurus calibrate the rest: a plan whose peak is double last season's is
 * either an opportunity or a warehouse problem, and neither is visible from
 * the projection alone.
 *
 * `previous_season: null` means there is no comparable season on record. That
 * is a gap and is printed as one — a cooperative in its first season did not
 * harvest zero tonnes, and telling them they did is worse than telling them
 * nothing (principle P3).
 */
export function PreviousSeason({
  previous,
  metrics,
}: {
  previous: PreviousSeasonResponse | null
  /** The chosen plan's figures, for the comparison. */
  metrics: PlanMetricsResponse
}) {
  if (!previous) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-[0.6875rem] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Belum ada musim pembanding</span> — koperasi
        ini belum punya musim tercatat yang setara, jadi angkanya ditulis{' '}
        <span className="font-semibold">—</span>, bukan 0 t. Perbandingannya muncul sendiri setelah
        satu musim penuh tercatat.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
      <p className="text-[0.6875rem] font-medium text-muted-foreground">
        Dibandingkan {previous.label} — satu-satunya angka di layar ini yang benar-benar terjadi
      </p>
      <dl className="mt-2 grid grid-cols-3 gap-x-4 gap-y-2">
        <Comparison
          label="Puncak mingguan"
          then={previous.peak_tonnes}
          now={metrics.peak_tonnes_expected}
          unit="t"
        />
        <Comparison
          label="Total semusim"
          then={previous.total_tonnes}
          now={metrics.total_tonnes_mid}
          unit="t"
        />
        <div>
          <dt className="text-[0.6875rem] text-muted-foreground">Blok musim lalu</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
            {formatNumberId(previous.blocks, 0)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

/**
 * One figure then, the same figure now, and the difference between them.
 *
 * The difference is subtraction of two numbers the backend sent, which is the
 * only arithmetic this app does on its own — and it is stated as a difference,
 * never as a verdict. Whether a higher peak is good news depends on how much
 * room the cooperative's store has, and this screen does not know that.
 */
function Comparison({
  label, then, now, unit,
}: {
  label: string
  then: number
  now: number
  unit: string
}) {
  const delta = now - then
  const sign = delta > 0 ? '+' : '−'

  return (
    <div>
      <dt className="text-[0.6875rem] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
        {formatNumberId(now)} {unit}
      </dd>
      <p className="text-[0.6875rem] leading-snug tabular-nums text-muted-foreground">
        {formatNumberId(then)} {unit} musim lalu
        {Math.abs(delta) >= 0.05 && ` · ${sign}${formatNumberId(Math.abs(delta))} ${unit}`}
      </p>
    </div>
  )
}
