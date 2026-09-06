import { User } from 'lucide-react'
import Link from 'next/link'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { formatNumberId } from '@/lib/format/number'
import { commodityColour } from '@/lib/plots/colour'
import type { PlotSummary } from '@/lib/plots/summary'

export type CommodityRef = { id: string; name: string; spriteRow: number }

/**
 * One plot in the list.
 *
 * The card is read top to bottom in the order a kader asks the questions:
 * which land, whose, growing what, due when, how far along, how much. Every
 * band is one question, so a grid of these can be scanned a row at a time
 * rather than re-parsed card by card.
 *
 * There is no crop picture. A cell of the canvas sprite sheet used to sit in
 * the top-right corner in a bordered box -- pixel art at 2x beside line icons,
 * which read as two products stapled together, and it said nothing the
 * commodity tag underneath does not say in words.
 */
export function PlotCard({
  plot, commodities,
}: {
  plot: PlotSummary
  /** Looked up by id; the list is the cooperative's whole commodity table. */
  commodities: Map<string, CommodityRef>
}) {
  const grown = plot.commodityIds
    .map(id => commodities.get(id))
    .filter((c): c is CommodityRef => c != null)

  const lead = grown[0]
  const stripe = lead ? commodityColour(lead.spriteRow) : 'var(--border)'

  return (
    <Link
      href={`/plots/${plot.id}`}
      className="panel panel-hover group relative flex flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {/* The lead commodity's colour, so a grid can be scanned by crop before
          a single name is read. Data, not decoration. */}
      <span aria-hidden className="h-1 shrink-0" style={{ background: stripe }} />

      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-[var(--terrion-green-700)]">
              {plot.name}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <User aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{plot.memberName ?? 'Petani tidak tercatat'}</span>
            </p>
          </div>
          <span className="badge-tag shrink-0 tabular-nums">
            {formatNumberId(plot.areaHa)} ha
          </span>
        </div>

        {grown.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {grown.map(c => (
              <CommodityTag key={c.id} name={c.name} colour={commodityColour(c.spriteRow)} />
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
          <p className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Panen terdekat
          </p>
          <div className="mt-1">
            {plot.nextWindow ? (
              <HarvestWindow size="sm" window={plot.nextWindow} />
            ) : (
              <span className="text-[0.8rem] text-muted-foreground">
                Belum ada tanaman aktif
              </span>
            )}
          </div>
        </div>

        {plot.progress != null && plot.progress < 1 && (
          <SeasonMeter progress={plot.progress} colour={stripe} />
        )}

        <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
          <Fact label="Blok" value={`${formatNumberId(plot.blockCount)} blok`} />
          <Fact
            label="Perkiraan hasil"
            value={plot.expectedTonnes != null ? `± ${formatNumberId(plot.expectedTonnes)} t` : '—'}
            align="right"
          />
        </dl>
      </div>
    </Link>
  )
}

/** A commodity's name, dotted in its own colour -- the same shape the browser's filter chips use. */
function CommodityTag({ name, colour }: { name: string; colour: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[0.6875rem] font-medium text-foreground">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: colour }} />
      {name}
    </span>
  )
}

/** One figure in the card's foot: what it counts, then the number. */
function Fact({
  label, value, align = 'left',
}: {
  label: string
  value: string
  align?: 'left' | 'right'
}) {
  return (
    <div className={align === 'right' ? 'text-right' : undefined}>
      <dt className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

/**
 * How far the soonest block is through the heat its variety needs.
 */
function SeasonMeter({ progress, colour }: { progress: number; colour: string }) {
  const percent = Math.round(progress * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-[0.6875rem] font-medium text-muted-foreground">
        <span>Perkembangan musim</span>
        <span className="tabular-nums font-semibold text-foreground">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%`, background: colour }}
        />
      </div>
    </div>
  )
}
