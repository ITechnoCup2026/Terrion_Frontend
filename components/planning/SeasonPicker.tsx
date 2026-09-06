'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CalendarRange } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { SeasonOption } from '@/lib/planning/season'

/**
 * Which season is being planned for.
 *
 * A list of seasons rather than a pair of date fields, which is decision K2:
 * Terrion already thinks in MT I and MT II, the plot form already offers both,
 * and letting anyone type a range would invite plans that cannot be compared
 * with the season before them.
 *
 * The choice goes into the URL rather than into component state, so a computed
 * proposal has an address a pengurus can bookmark and reload — and so the
 * server component above can do the fetching.
 */
export function SeasonPicker({
  seasons,
  current,
  autoFocusSubmit = false,
}: {
  seasons: SeasonOption[]
  /** The season already being shown, if any. */
  current?: string
  autoFocusSubmit?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [season, setSeason] = useState(current ?? seasons[0]?.label ?? '')

  const submit = () => {
    if (!season) return
    startTransition(() => {
      router.push(`/rencana/susun?season=${encodeURIComponent(season)}`)
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-56 flex-col gap-1.5">
        <label htmlFor="season" className="text-xs font-medium text-muted-foreground">
          Musim tanam yang direncanakan
        </label>
        <div className="relative">
          <CalendarRange
            aria-hidden
            className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"
          />
          <select
            id="season"
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="interactive h-9 w-full rounded-lg border border-input/80 bg-card pl-9 pr-3 text-sm font-medium text-foreground focus:border-ring focus:ring-1 focus:ring-ring/40 focus:outline-none"
          >
            {seasons.map(s => (
              <option key={s.label} value={s.label}>{s.label} · {s.range}</option>
            ))}
          </select>
        </div>
      </div>

      <Button type="button" size="lg" onClick={submit} disabled={pending || !season} autoFocus={autoFocusSubmit}>
        {pending ? 'Menghitung…' : 'Hitung usulan rencana'}
      </Button>
    </div>
  )
}
