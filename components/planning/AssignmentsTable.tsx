'use client'

import { useMemo, useState } from 'react'
import { Pencil, Search } from 'lucide-react'

import { PlausibilityBadge } from '@/components/planning/PlausibilityBadge'
import { Badge } from '@/components/ui/Badge'
import {
  SegmentedControl, Table, TableFrame, TableToolbar, TBody, Td, Th, THead,
} from '@/components/ui/DataTable'
import { utcDate } from '@/lib/agronomy/dates'
import { formatNumberId } from '@/lib/format/number'
import { formatDateId, formatHarvestRange } from '@/lib/harvest/format'
import { isEdited, overriddenAssignment, type AssignmentOverrides } from '@/lib/planning/apply'
import { matchesSearch } from '@/lib/planning/filter'
import type { PlanAssignmentResponse } from '@/lib/planning/types'

/**
 * A plan, member by member.
 *
 * A list rather than a chart, because this is the screen a pengurus acts from:
 * they read down it looking for one person's land, change it, and move on. A
 * bar chart of tonnage per week says whether the plan is good; only a list
 * says what to tell Pak Ujang.
 *
 * Editing is the visible face of principle P1 — the planner proposes, the
 * pengurus decides. Two fields may be changed, variety and planting date, and
 * they are exactly the two the apply request carries.
 *
 * The honesty problem editing creates, and how it is handled: an edited row's
 * harvest window and tonnage on screen still describe the *original* variety
 * and date. Go recomputes both when the plan is applied and this app never
 * simulates anything itself. So an edited row stops showing those figures and
 * says they will be recomputed, rather than showing numbers that quietly
 * belong to a different decision.
 */

export type VarietyOption = { id: string; name: string }
/** Varieties keyed by commodity id — a row may only move within its crop. */
export type VarietyCatalogue = Record<string, VarietyOption[]>

/** Which rows the pengurus wants in front of them before applying. */
type Verdict = 'semua' | 'periksa' | 'meragukan'

const control =
  'interactive h-8 rounded-md border border-input/80 bg-card px-2 text-xs text-foreground '
  + 'focus:border-ring focus:ring-1 focus:ring-ring/40 focus:outline-none'

export function AssignmentsTable({
  assignments,
  overrides = {},
  onChange,
  varieties,
  plantingFrom,
  plantingTo,
  maxHeight = '32rem',
}: {
  assignments: PlanAssignmentResponse[]
  overrides?: AssignmentOverrides
  /** Omit to render read-only — the saved-plan screen passes nothing. */
  onChange?: (plotId: string, patch: { variety_id?: string; planting_date?: string }) => void
  varieties?: VarietyCatalogue
  plantingFrom?: string
  plantingTo?: string
  maxHeight?: string
}) {
  const [query, setQuery] = useState('')
  const [verdict, setVerdict] = useState<Verdict>('semua')
  const editable = Boolean(onChange)

  // Counted over every assignment, not the filtered view: a tab that shrank as
  // you typed would stop being a way to find what needs checking.
  const needsCheck = useMemo(
    () => assignments.filter(a => a.plausibility !== 'ok').length,
    [assignments],
  )

  const rows = useMemo(() => {
    const merged = assignments.map(a => ({
      original: a,
      row: overriddenAssignment(a, overrides),
      edited: isEdited(a, overrides),
    }))

    return merged.filter(({ row }) => {
      if (verdict === 'periksa' && row.plausibility === 'ok') return false
      if (verdict === 'meragukan' && row.plausibility !== 'implausible') return false
      // The same matcher the saved-plan list uses, so a member found while
      // deciding is findable afterwards by the same words.
      return matchesSearch([row.member_name, row.plot_name, row.variety_name], query)
    })
  }, [assignments, overrides, query, verdict])

  const totalHa = assignments.reduce((sum, a) => sum + a.area_ha, 0)

  return (
    <TableFrame>
      <TableToolbar
        meta={
          <>
            {rows.length === assignments.length
              ? `${assignments.length} penugasan`
              : `${rows.length} dari ${assignments.length} penugasan`}
            <span aria-hidden>·</span>
            {formatNumberId(totalHa, 2)} ha
          </>
        }
      >
        <div className="relative min-w-56 flex-1">
          <Search aria-hidden className="absolute left-3 top-2 size-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari anggota, lahan, atau varietas…"
            aria-label="Cari anggota, lahan, atau varietas"
            className="interactive h-8 w-full rounded-lg border border-input/80 bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:ring-1 focus:ring-ring/40 focus:outline-none"
          />
        </div>

        <SegmentedControl
          options={[
            { value: 'semua', label: 'Semua', count: assignments.length },
            { value: 'periksa', label: 'Perlu diperiksa', count: needsCheck },
            { value: 'meragukan', label: 'Meragukan' },
          ]}
          value={verdict}
          onChange={setVerdict}
          ariaLabel="Saring menurut kelayakan jendela panen"
        />
      </TableToolbar>

      <div className="overflow-auto" style={{ maxHeight }}>
        <Table>
          <THead>
            <tr>
              <Th>Anggota</Th>
              <Th>Lahan</Th>
              <Th numeric>Luas</Th>
              <Th>Varietas</Th>
              <Th>Tanam</Th>
              <Th>Jendela panen</Th>
              <Th numeric>Perkiraan panen</Th>
              <Th>Kelayakan</Th>
            </tr>
          </THead>
          <TBody>
            {rows.map(({ original, row, edited }) => {
              const options = varieties?.[row.commodity_id] ?? []
              return (
                <tr key={row.plot_id} className={edited ? 'bg-[var(--terrion-gold-50)]/40' : undefined}>
                  <Td className="font-medium text-foreground">{row.member_name}</Td>
                  <Td className="text-muted-foreground">{row.plot_name}</Td>
                  <Td numeric>{formatNumberId(row.area_ha, 2)} ha</Td>

                  <Td>
                    {editable && options.length > 1 ? (
                      <select
                        aria-label={`Varietas untuk ${row.plot_name}`}
                        className={control}
                        value={row.variety_id}
                        onChange={e => onChange?.(row.plot_id, { variety_id: e.target.value })}
                      >
                        {options.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    ) : (
                      row.variety_name
                    )}
                  </Td>

                  <Td>
                    {editable ? (
                      <input
                        type="date"
                        aria-label={`Tanggal tanam untuk ${row.plot_name}`}
                        className={control}
                        value={row.planting_date}
                        min={plantingFrom}
                        max={plantingTo}
                        onChange={e => onChange?.(row.plot_id, { planting_date: e.target.value })}
                      />
                    ) : (
                      formatDateId(utcDate(row.planting_date))
                    )}
                  </Td>

                  {/* An edited row's window and tonnage belong to the original
                      variety and date. Showing them would be a lie the reader
                      cannot detect, so the row says what will happen instead. */}
                  {edited ? (
                    <Td colSpan={3} className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Pencil aria-hidden className="size-3" />
                        Diubah pengurus — jendela panen dan perkiraan tonasenya dihitung ulang saat
                        rencana diterapkan.
                      </span>
                    </Td>
                  ) : (
                    <>
                      <Td className="whitespace-nowrap text-muted-foreground">
                        {formatHarvestRange(utcDate(row.harvest_start), utcDate(row.harvest_end))}
                      </Td>
                      <Td numeric>
                        {formatNumberId(row.tonnes_low)}–{formatNumberId(row.tonnes_high)} t
                        <span className="block text-[0.6875rem] text-muted-foreground">
                          tengah {formatNumberId(row.tonnes_mid)} t
                        </span>
                      </Td>
                      <Td>
                        <PlausibilityBadge value={original.plausibility} />
                      </Td>
                    </>
                  )}
                </tr>
              )
            })}

            {rows.length === 0 && (
              <tr>
                <Td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Tidak ada penugasan yang cocok dengan pencarian itu.
                </Td>
              </tr>
            )}
          </TBody>
        </Table>
      </div>
    </TableFrame>
  )
}

/** How many rows carry a window the model does not stand behind. */
export function DoubtfulWindowsNote({ assignments }: { assignments: PlanAssignmentResponse[] }) {
  const doubtful = assignments.filter(a => a.plausibility === 'implausible').length
  const off = assignments.filter(a => a.plausibility === 'early' || a.plausibility === 'late').length
  if (doubtful === 0 && off === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {doubtful > 0 && <Badge tone="negative">{doubtful} jendela panen meragukan</Badge>}
      {off > 0 && <Badge tone="warning">{off} jendela panen di luar kebiasaan</Badge>}
      <span>Periksa baris-baris ini sebelum rencana diterapkan.</span>
    </div>
  )
}
