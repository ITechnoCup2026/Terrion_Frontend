import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { Card, CardHeader } from '@/components/ui/Card'
import { ShareBar } from '@/components/ui/Sparkbars'
import { formatNumberId } from '@/lib/format/number'
import { OBJECTIVE_COPY } from '@/lib/planning/copy'
import type { CommodityShare, HarvestMonth, PlanTotals } from '@/lib/planning/summary'
import type { PlanObjective } from '@/lib/planning/types'

/**
 * The three readings a saved plan needs beyond its row-by-row table.
 *
 * A table of 47 rows answers "what is Pak Ujang planting" and answers nothing
 * else. A pengurus opening a plan three weeks after applying it is asking
 * different questions — how much land is committed, when the harvest lands,
 * what the cooperative grows next season — and every one of those was already
 * on the page as 47 rows nobody can add up by eye.
 *
 * Every figure here is arithmetic over numbers Go sent (see
 * `lib/planning/summary.ts`). Nothing on this screen re-derives a peak, a
 * collision or a capacity verdict: those are computed from the real weekly
 * buckets on the dashboard, and a second opinion drawn here would drift from
 * it without anyone noticing.
 */

/** What was optimised and what it cost, kept beside the plan it explains. */
export function ObjectiveTradeOff({ objective }: { objective: PlanObjective }) {
  const copy = OBJECTIVE_COPY[objective]
  if (!copy) return null

  return (
    <dl className="grid gap-3 rounded-lg bg-muted/50 px-3.5 py-3 sm:grid-cols-2">
      <div className="flex gap-2">
        <ArrowUpRight
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0 text-[var(--terrion-green-700)]"
        />
        <div className="min-w-0">
          <dt className="text-[0.6875rem] font-medium text-muted-foreground">Yang dioptimalkan</dt>
          <dd className="text-xs leading-snug text-foreground/90">{copy.optimises}</dd>
        </div>
      </div>
      <div className="flex gap-2">
        <ArrowDownRight
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0 text-[var(--terrion-gold-600)]"
        />
        <div className="min-w-0">
          <dt className="text-[0.6875rem] font-medium text-muted-foreground">Yang dikorbankan</dt>
          <dd className="text-xs leading-snug text-foreground/90">{copy.sacrifices}</dd>
        </div>
      </div>
    </dl>
  )
}

/**
 * When the harvest lands, month by month — as a list.
 *
 * This began as a bar chart and should not have. Fase 3 of the work plan is
 * explicit that the planner's screens are for acting and therefore take the
 * shape of lists rather than graphs (aturan R5), and the rule earns itself
 * here: a pengurus reading "Mar 2027 · 12 lahan · 84 t" can ring the twelve
 * members concerned, while a column of that height only tells them March looks
 * tall. The share bar stays as a row ornament — the same one the RDKK and
 * catalogue lists use — because placing a figure against its neighbours is not
 * the same as replacing it with a picture.
 *
 * Deliberately not called a peak. A month is not the week the dashboard
 * measures, the bucket is the window's opening month rather than its span, and
 * calling this a peak would invite comparison against a capacity figure it was
 * never computed the same way as.
 */
export function HarvestSpread({ months }: { months: HarvestMonth[] }) {
  if (months.length === 0) return null

  const heaviest = Math.max(...months.map(m => m.tonnesMid))

  return (
    <Card pad="lg" className="flex flex-col gap-4">
      <CardHeader
        title="Sebaran panen"
        description="Perkiraan tengah, dikelompokkan menurut bulan jendela panen dibuka. Bulan kosong berarti tidak ada yang matang, bukan data yang hilang."
      />
      <ul className="flex flex-col gap-2.5">
        {months.map(month => (
          <li key={month.key} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span
                className={
                  month.plots > 0
                    ? 'text-xs font-semibold text-foreground'
                    : 'text-xs font-medium text-muted-foreground'
                }
              >
                {month.label}
              </span>
              <span className="text-[0.6875rem] tabular-nums text-muted-foreground">
                {month.plots > 0 ? (
                  <>
                    {formatNumberId(month.plots, 0)} lahan ·{' '}
                    <span className="font-medium text-foreground">
                      {formatNumberId(month.tonnesMid)} t
                    </span>
                  </>
                ) : (
                  'tidak ada yang matang'
                )}
              </span>
            </div>
            <ShareBar value={month.tonnesMid} max={heaviest} />
          </li>
        ))}
      </ul>
      <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
        Penumpukan diukur per minggu, bukan per bulan, dan hitungannya ada di dasbor — dari blok
        tanam yang ditulis rencana ini, bukan dari angka di layar ini.
      </p>
    </Card>
  )
}

/** What the cooperative grows next season, as a ratio rather than 47 rows. */
export function CommodityBreakdown({ rows }: { rows: CommodityShare[] }) {
  if (rows.length === 0) return null

  const heaviest = Math.max(...rows.map(r => r.tonnesMid))

  return (
    <Card pad="lg" className="flex flex-col gap-4">
      <CardHeader
        title="Tanaman musim ini"
        description="Luas dan perkiraan panen per komoditas, terberat lebih dulu."
      />
      <ul className="flex flex-col gap-3">
        {rows.map(row => (
          <li key={row.commodityId} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-xs font-semibold text-foreground">{row.commodityName}</span>
              <span className="text-[0.6875rem] tabular-nums text-muted-foreground">
                {formatNumberId(row.plots, 0)} lahan · {formatNumberId(row.areaHa, 2)} ha ·{' '}
                <span className="font-medium text-foreground">
                  {formatNumberId(row.tonnesMid)} t
                </span>{' '}
                perkiraan tengah
              </span>
            </div>
            <ShareBar value={row.tonnesMid} max={heaviest} />
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** The plan's own size, in the units a pengurus commits to. */
export function PlanScale({ totals }: { totals: PlanTotals }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      <Fact
        label="Luas ditanam"
        value={`${formatNumberId(totals.areaHa, 2)} ha`}
        // The plot count sits in the card above this one; repeating it here
        // would spend a line on a number the reader just read.
        hint={`tersebar di ${formatNumberId(totals.members, 0)} anggota`}
      />
      <Fact
        label="Perkiraan panen"
        value={`${formatNumberId(totals.tonnesMid)} t`}
        // R2: never a single number pretending to be a promise. The bounds are
        // the sum of every row's own bound — the season where each plot
        // disappoints, and the one where each does well — so they are named as
        // that rather than dressed up as a confidence interval.
        hint={`${formatNumberId(totals.tonnesLow)}–${formatNumberId(totals.tonnesHigh)} t bila seluruh lahan jatuh di batas bawah atau atas`}
      />
      <Fact
        label="Komoditas"
        value={formatNumberId(totals.commodities, 0)}
        hint="jenis tanaman dalam rencana ini"
      />
      <Fact
        label="Jendela panen perlu diperiksa"
        value={formatNumberId(totals.doubtful + totals.offWindow, 0)}
        hint={
          totals.doubtful + totals.offWindow === 0
            ? 'semua jendela panen wajar'
            : `${formatNumberId(totals.doubtful, 0)} meragukan · ${formatNumberId(totals.offWindow, 0)} di luar kebiasaan`
        }
        tone={totals.doubtful > 0 ? 'alert' : 'default'}
      />
    </dl>
  )
}

function Fact({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'alert'
}) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-medium text-muted-foreground">{label}</dt>
      <dd
        className={
          tone === 'alert'
            ? 'mt-0.5 text-sm font-semibold tabular-nums text-[var(--terrion-gold-600)]'
            : 'mt-0.5 text-sm font-semibold tabular-nums text-foreground'
        }
      >
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-[0.6875rem] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  )
}
