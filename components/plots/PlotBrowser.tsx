'use client'

import { Search, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { commodityColour } from '@/lib/plots/colour'
import {
  DEFAULT_FILTER, filterPlots, isDefaultFilter, parsePlotFilter, plotFilterParams,
  type Horizon, type PlotFilter, type SortKey,
} from '@/lib/plots/filter'
import type { PlotSummary } from '@/lib/plots/summary'
import { cn } from '@/lib/utils'
import { PlotCard, type CommodityRef } from './PlotCard'

const HORIZONS: { value: Horizon; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: '30', label: '30 hari' },
  { value: '90', label: '90 hari' },
  { value: 'season', label: 'Musim ini' },
]

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'harvest', label: 'Panen terdekat' },
  { value: 'name', label: 'Nama' },
  { value: 'area', label: 'Luas' },
]

/**
 * The plot list and the controls that narrow it.
 *
 * Filtering happens here rather than on the server because a cooperative has
 * tens of plots, and a round trip per keystroke on a village connection costs
 * more than sending the whole list once. The rules themselves are pure
 * functions in lib/plots/filter.ts; this owns only the state and the URL.
 *
 * The controls sit in a panel in the page's own gutter. They used to be a
 * sticky full-bleed band with a backdrop blur, bled past the padding with
 * negative margins -- a frosted strip says "layer floating above the page",
 * and a toolbar belonging to one list is not above anything.
 */
export function PlotBrowser({
  plots, commodities, onRegisterClick,
}: {
  plots: PlotSummary[]
  commodities: CommodityRef[]
  onRegisterClick?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [filter, setFilter] = useState<PlotFilter>(() => parsePlotFilter(searchParams))

  // Keep the address bar in step, so a filtered list can be sent to somebody.
  useEffect(() => {
    const query = plotFilterParams(filter).toString()
    window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname)
  }, [filter, pathname])

  const byId = useMemo(() => new Map(commodities.map(c => [c.id, c])), [commodities])

  // Only commodities somebody is actually growing.
  const grown = useMemo(() => {
    const ids = new Set(plots.flatMap(p => p.commodityIds))
    return commodities.filter(c => ids.has(c.id))
  }, [plots, commodities])

  const shown = useMemo(() => filterPlots(plots, filter), [plots, filter])
  const narrowed = !isDefaultFilter(filter)

  const toggleCommodity = (id: string) => setFilter(f => ({
    ...f,
    commodityIds: f.commodityIds.includes(id)
      ? f.commodityIds.filter(x => x !== id)
      : [...f.commodityIds, id],
  }))

  // Keeps the sort the reader chose: clearing a filter is about what is shown,
  // not about what order it is shown in.
  const clearFilter = () => setFilter(f => ({ ...DEFAULT_FILTER, sort: f.sort }))

  // Nothing registered at all: no point showing controls that filter nothing.
  if (plots.length === 0) {
    return (
      <EmptyState
        title="Belum ada lahan terdaftar"
        description="Daftarkan lahan pertama untuk mulai memperkirakan jendela panen."
        action={
          onRegisterClick ? (
            <button type="button" onClick={onRegisterClick} className={buttonVariants()}>
              Daftarkan lahan
            </button>
          ) : (
            <Link href="/plots?new=1" className={buttonVariants()}>Daftarkan lahan</Link>
          )
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={filter.query}
              onChange={e => setFilter(f => ({ ...f, query: e.target.value }))}
              placeholder="Cari lahan atau nama petani…"
              aria-label="Cari lahan atau nama petani"
              className="interactive h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/40"
            />
          </div>

          <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
            Urutkan
            <select
              value={filter.sort}
              onChange={e => setFilter(f => ({ ...f, sort: e.target.value as SortKey }))}
              className="interactive h-9 rounded-lg border border-input bg-card px-2.5 text-sm font-medium text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/40"
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border/70 pt-4">
          <FilterGroup label="Panen dalam">
            <Segmented
              options={HORIZONS}
              value={filter.horizon}
              onChange={horizon => setFilter(f => ({ ...f, horizon }))}
            />
          </FilterGroup>

          {grown.length > 1 && (
            <FilterGroup label="Komoditas">
              <div className="flex flex-wrap items-center gap-1.5">
                {grown.map(c => (
                  <Chip
                    key={c.id}
                    active={filter.commodityIds.includes(c.id)}
                    onClick={() => toggleCommodity(c.id)}
                    dot={commodityColour(c.spriteRow)}
                  >
                    {c.name}
                  </Chip>
                ))}
              </div>
            </FilterGroup>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Badge tone={narrowed ? 'positive' : 'neutral'} className="tabular-nums">
              <SlidersHorizontal aria-hidden className="size-3" />
              {narrowed ? `${shown.length} dari ${plots.length} lahan` : `${plots.length} lahan`}
            </Badge>
            {narrowed && (
              <button
                type="button"
                onClick={clearFilter}
                className="interactive inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X aria-hidden className="size-3.5" />
                Hapus saringan
              </button>
            )}
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        // Deliberately NOT the same sentence as "no plots registered". One
        // means look elsewhere, the other means go and register something.
        <EmptyState
          title="Tidak ada lahan yang cocok"
          description="Tidak ada lahan yang cocok dengan pencarian dan saringan ini."
          action={
            <button type="button" onClick={clearFilter} className={buttonVariants({ variant: 'outline' })}>
              Hapus saringan
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map(p => <PlotCard key={p.id} plot={p} commodities={byId} />)}
        </div>
      )}
    </div>
  )
}

/** A named run of controls, so two rows of chips do not read as one long run. */
function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

/**
 * One choice out of a short, fixed, mutually exclusive set.
 *
 * The horizons were four loose chips, which is the shape this file also uses
 * for the commodity toggles -- so the same control said "pick one" in one row
 * and "pick any" in the next.
 */
function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'interactive rounded-md px-2.5 py-1 text-xs font-medium',
              active
                ? 'bg-card text-[var(--terrion-green-700)] shadow-[var(--shadow-xs)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** A toggle that reads as a filter rather than a button. */
function Chip({
  active, onClick, dot, children,
}: {
  active: boolean
  onClick: () => void
  dot?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'interactive inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        active
          ? 'border-[var(--terrion-green-700)] bg-[var(--terrion-green-700)] text-white'
          : 'border-border text-muted-foreground hover:border-input hover:bg-muted hover:text-foreground',
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn('size-2 rounded-full', active && 'ring-1 ring-white/70')}
          style={{ background: dot }}
        />
      )}
      {children}
    </button>
  )
}
