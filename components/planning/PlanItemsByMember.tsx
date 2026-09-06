'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PlausibilityBadge } from '@/components/planning/PlausibilityBadge'
import { Badge } from '@/components/ui/Badge'
import { utcDate } from '@/lib/agronomy/dates'
import { formatNumberId } from '@/lib/format/number'
import { formatDateId, formatHarvestRange } from '@/lib/harvest/format'
import { groupByMember, matchesSearch } from '@/lib/planning/filter'
import { membersOverSubsidyCap } from '@/lib/planning/members'
import type { SeasonPlanItemResponse } from '@/lib/planning/types'
import { cn } from '@/lib/utils'

/**
 * What each member plants, when, and what comes back — the plan as work.
 *
 * Fase 3 of `docs/RENCANA_KERJA_FITUR_RENCANA_TANAM.md` asks for this shape in
 * one line: *"Daftar penugasan per anggota — bisa dicari, bisa disaring. Ini
 * layar untuk bertindak, jadi bentuknya daftar, bukan grafik."* Three things
 * follow from that sentence and all three are load-bearing here.
 *
 * **Per member, not per plot.** The old table was one row per plot in whatever
 * order the backend sent them, so a member holding three plots appeared three
 * times, scattered. Nobody acts on a plan plot by plot: they ring Pak Endang,
 * and Pak Endang wants to hear about all of his land at once.
 *
 * **Searchable and filterable.** A cooperative of forty-seven plots is past
 * the size where scrolling is a search strategy.
 *
 * **A list, not a chart.** Every figure sits next to the name it belongs to,
 * because the next step after reading it is a phone call, not an analysis.
 *
 * It also has to work at 360 px, which the nine-column table it replaces never
 * could: each assignment is a block that stacks on a phone and spreads across
 * a desktop, rather than a row that scrolls sideways off a cheap handset.
 */

type Verdict = 'semua' | 'periksa' | 'meragukan'

const VERDICTS: readonly { value: Verdict; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  { value: 'periksa', label: 'Perlu diperiksa' },
  { value: 'meragukan', label: 'Meragukan' },
]

export function PlanItemsByMember({ items }: { items: SeasonPlanItemResponse[] }) {
  const [query, setQuery] = useState('')
  const [commodity, setCommodity] = useState('semua')
  const [verdict, setVerdict] = useState<Verdict>('semua')

  const commodities = useMemo(() => {
    const seen = new Map<string, string>()
    for (const item of items) seen.set(item.commodity_id, item.commodity_name)
    return [...seen].map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'))
  }, [items])

  const filtered = useMemo(() => items.filter(item => {
    if (commodity !== 'semua' && item.commodity_id !== commodity) return false
    if (verdict === 'meragukan' && item.plausibility !== 'implausible') return false
    if (verdict === 'periksa' && item.plausibility === 'ok') return false
    return matchesSearch(
      [item.member_name, item.plot_name, item.commodity_name, item.variety_name],
      query,
    )
  }), [items, query, commodity, verdict])

  const groups = useMemo(() => groupByMember(filtered), [filtered])
  // Measured against the whole plan, not the filtered view: a member is over
  // the cap because of everything they grow, and hiding half their plots
  // behind a filter must not make the warning disappear.
  const overCap = useMemo(
    () => new Set(membersOverSubsidyCap(items).map(m => m.memberId)),
    [items],
  )

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search aria-hidden className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari anggota, lahan, atau tanaman…"
              aria-label="Cari anggota, lahan, atau tanaman"
              className="interactive h-9 w-full rounded-lg border border-input/80 bg-card pr-3 pl-9 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:ring-1 focus:ring-ring/40 focus:outline-none sm:text-sm"
            />
          </div>

          {commodities.length > 1 && (
            <select
              value={commodity}
              onChange={e => setCommodity(e.target.value)}
              aria-label="Saring menurut tanaman"
              className="interactive h-9 rounded-lg border border-input/80 bg-card px-3 text-xs font-medium text-foreground focus:border-ring focus:ring-1 focus:ring-ring/40 focus:outline-none sm:text-sm"
            >
              <option value="semua">Semua tanaman</option>
              {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Saring menurut kelayakan jendela panen</legend>
          {VERDICTS.map(v => (
            <button
              key={v.value}
              type="button"
              onClick={() => setVerdict(v.value)}
              aria-pressed={verdict === v.value}
              className={cn(
                'interactive rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors',
                verdict === v.value
                  ? 'border-[var(--terrion-green-500)] bg-[var(--terrion-green-500)]/10 text-foreground'
                  : 'border-border text-muted-foreground hover:border-input hover:bg-muted hover:text-foreground',
              )}
            >
              {v.label}
            </button>
          ))}
        </fieldset>

        <p className="text-[0.6875rem] text-muted-foreground">
          Menampilkan {formatNumberId(filtered.length, 0)} dari{' '}
          {formatNumberId(items.length, 0)} penugasan · {formatNumberId(groups.length, 0)} anggota
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
          Tidak ada penugasan yang cocok dengan pencarian ini.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map(group => (
            <li
              key={group.memberId}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-xs)]"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/70 bg-muted/40 px-3.5 py-2.5">
                <h3 className="text-sm font-semibold text-foreground">{group.memberName}</h3>
                <span className="text-[0.6875rem] tabular-nums text-muted-foreground">
                  {formatNumberId(group.rows.length, 0)} lahan ·{' '}
                  {formatNumberId(group.areaHa, 2)} ha
                </span>
                {overCap.has(group.memberId) && (
                  <Badge tone="warning">Di atas batas subsidi</Badge>
                )}
              </div>

              <ul className="divide-y divide-border/70">
                {group.rows.map(item => <AssignmentRow key={item.id} item={item} />)}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * One plot's instruction: what to plant, when to plant it, what comes back.
 *
 * Stacked at 360 px and spread over four columns from `sm` up. The planting
 * date leads the timing pair because it is the only figure on this screen the
 * reader acts on directly — the harvest window is what that date produces.
 */
function AssignmentRow({ item }: { item: SeasonPlanItemResponse }) {
  return (
    <li className="grid gap-2 px-3.5 py-3 sm:grid-cols-4 sm:gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{item.plot_name}</p>
        <p className="text-[0.6875rem] tabular-nums text-muted-foreground">
          {formatNumberId(item.area_ha, 2)} ha
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-xs text-foreground">{item.commodity_name}</p>
        <p className="text-[0.6875rem] text-muted-foreground">{item.variety_name}</p>
      </div>

      <div className="min-w-0">
        <p className="text-xs text-foreground">
          <span className="text-muted-foreground">Tanam </span>
          {formatDateId(utcDate(item.planting_date))}
        </p>
        <p className="text-[0.6875rem] text-muted-foreground">
          Panen {formatHarvestRange(utcDate(item.harvest_start), utcDate(item.harvest_end))}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-end sm:gap-1">
        <p className="text-xs font-semibold tabular-nums text-foreground">
          {formatNumberId(item.tonnes_low)}–{formatNumberId(item.tonnes_high)} t
        </p>
        <p className="text-[0.6875rem] tabular-nums text-muted-foreground">
          tengah {formatNumberId(item.tonnes_mid)} t
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <PlausibilityBadge value={item.plausibility} />
          {item.block_id === null && <Badge tone="neutral">Blok dilepas</Badge>}
        </div>
      </div>
    </li>
  )
}
