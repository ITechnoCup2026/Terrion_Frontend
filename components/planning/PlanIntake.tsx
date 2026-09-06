'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { CalendarRange } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { OBJECTIVE_COPY, OBJECTIVES } from '@/lib/planning/copy'
import { GOAL_MAX_CHARS, readGoal } from '@/lib/planning/goal'
import type { SeasonOption } from '@/lib/planning/season'
import type { PlanObjective } from '@/lib/planning/types'
import { cn } from '@/lib/utils'

/**
 * Where a season plan starts: the season, and what the pengurus is after.
 *
 * Two things leave this form, and they do different work. The sentence goes to
 * the planner as `goal` on `GET /api/plans/propose`, where it shifts how
 * strongly an objective is weighted — a real effect on a real computation, and
 * the reason a changed sentence means waiting the full two to four seconds
 * again. The preset decides which of the three returned plans is the one drawn
 * up, so that a pengurus who has already said what they are after is not handed
 * the same question a second time on the next screen.
 *
 * What the sentence cannot do is stated on the screen rather than buried here:
 * it never becomes a number. Every tonne, rupiah and date still comes from the
 * deterministic solver in Go (`docs/INTEGRASI_FRONTEND.md` §3.4), and a
 * request that would invert the meaning of a label is ignored rather than
 * obeyed. Saying that plainly is what keeps this screen honest on the day the
 * model behind `goal` gets better at reading Indonesian.
 *
 * Leaving the box empty is normal and faster, not a degraded path: with no
 * goal the backend uses its default weights and skips the model call
 * altogether. So an empty box sends no parameter at all rather than an empty
 * string standing in for "netral".
 *
 * The reading is shown before the search runs and can be overridden with one
 * tap, which is §9.4 — a translated goal is a proposal, like the plan itself.
 */
export function PlanIntake({
  seasons,
  suggested,
  initialObjective = null,
  initialSentence = '',
}: {
  seasons: SeasonOption[]
  /** The season the planner recommends: the next one, not the current one. */
  suggested?: string
  /** What they chose last time, when the form is being shown to them again. */
  initialObjective?: PlanObjective | null
  /** Their sentence, kept across a refusal so nobody retypes a paragraph. */
  initialSentence?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [season, setSeason] = useState(suggested ?? seasons[0]?.label ?? '')
  const [objective, setObjective] = useState<PlanObjective | null>(initialObjective)
  const [sentence, setSentence] = useState(initialSentence)

  const reading = useMemo(() => readGoal(sentence), [sentence])

  const submit = () => {
    if (!season) return
    const params = new URLSearchParams({ season })
    // The sentence's reading only travels if the reader left it in place; an
    // explicit preset always wins over the words.
    const chosen = objective ?? reading.objective
    if (chosen) params.set('tujuan', chosen)
    // Trimmed, and only when there is something to send: an empty `goal` is
    // not neutral, it is a parameter the backend has to weigh.
    const stated = sentence.trim().slice(0, GOAL_MAX_CHARS)
    if (stated) params.set('kalimat', stated)

    startTransition(() => router.push(`/rencana/susun?${params}`))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="season" className="text-xs font-medium text-muted-foreground">
          Musim tanam yang direncanakan
        </label>
        <div className="relative max-w-sm">
          <CalendarRange
            aria-hidden
            className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
          />
          <select
            id="season"
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="interactive h-9 w-full rounded-lg border border-input/80 bg-card pr-3 pl-9 text-sm font-medium text-foreground focus:border-ring focus:ring-1 focus:ring-ring/40 focus:outline-none"
          >
            {seasons.map(s => (
              <option key={s.label} value={s.label}>{s.label} · {s.range}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="text-xs font-medium text-muted-foreground">
          Apa yang paling Anda kejar musim ini?
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {OBJECTIVES.map(value => {
            const copy = OBJECTIVE_COPY[value]
            const active = (objective ?? reading.objective) === value

            return (
              <label
                key={value}
                className={cn(
                  'interactive flex cursor-pointer flex-col gap-1 rounded-lg border bg-card p-3 transition-all',
                  'focus-within:ring-2 focus-within:ring-ring/40',
                  active
                    ? 'border-[var(--terrion-green-500)] ring-1 ring-[var(--terrion-green-500)]/30'
                    : 'border-border hover:border-[var(--terrion-green-300)]',
                )}
              >
                <input
                  type="radio"
                  name="tujuan"
                  value={value}
                  checked={active}
                  onChange={() => setObjective(value)}
                  className="sr-only"
                />
                <span className="text-xs font-semibold text-foreground">
                  <span className="text-muted-foreground">{copy.letter} · </span>
                  {copy.label}
                </span>
                <span className="text-[0.6875rem] leading-snug text-muted-foreground">
                  {copy.question}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="kalimat" className="text-xs font-medium text-muted-foreground">
          Atau tuliskan sendiri, dengan kalimat Anda
        </label>
        <textarea
          id="kalimat"
          value={sentence}
          onChange={e => setSentence(e.target.value)}
          rows={3}
          maxLength={GOAL_MAX_CHARS}
          placeholder="Contoh: Musim depan saya tidak mau harga jatuh seperti Maret kemarin."
          className="interactive w-full rounded-lg border border-input/80 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:ring-1 focus:ring-ring/40 focus:outline-none"
        />
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <GoalReadingNote
            sentence={sentence}
            reading={reading}
            overridden={objective !== null && objective !== reading.objective}
          />
          {/* The backend refuses over 500 with `plan_goal_too_long`. Counting
              down here is cheaper than a round trip that ends in a refusal. */}
          <span
            className={
              sentence.length > GOAL_MAX_CHARS - 50
                ? 'shrink-0 text-[0.6875rem] tabular-nums text-[var(--terrion-gold-600)]'
                : 'shrink-0 text-[0.6875rem] tabular-nums text-muted-foreground'
            }
          >
            {sentence.length}/{GOAL_MAX_CHARS}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
        <Button type="button" size="lg" onClick={submit} disabled={pending || !season}>
          {pending ? 'Menghitung…' : 'Hitung usulan rencana'}
        </Button>
        <p className="max-w-prose text-[0.6875rem] leading-relaxed text-muted-foreground">
          Tujuan di atas menentukan rencana mana yang disusun untuk Anda, dan kalimat Anda ikut
          dikirim ke perencana untuk menggeser penekanannya. Angkanya sendiri — tonase, rupiah,
          tanggal — tetap dihitung solver, bukan model bahasa. Boleh dikosongkan: tanpa kalimat,
          perhitungannya memakai bobot bawaan dan selesai lebih cepat.
        </p>
      </div>
    </div>
  )
}

/**
 * The reading, shown back before anything runs.
 *
 * Never silent about how it read the sentence, and never confident when it
 * should not be: a tie and a miss both end with "pilih sendiri" rather than a
 * guess. §9.1 of the AI document names a plausible-but-wrong translation as
 * this feature's likeliest way of misleading somebody, and a keyword matcher
 * has no way to notice it was wrong.
 */
function GoalReadingNote({
  sentence,
  reading,
  overridden,
}: {
  sentence: string
  reading: ReturnType<typeof readGoal>
  overridden: boolean
}) {
  if (!sentence.trim()) return null

  if (overridden) {
    return (
      <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
        Anda sudah memilih tujuan sendiri di atas, jadi kalimat ini disimpan sebagai catatan saja.
      </p>
    )
  }

  if (reading.ambiguous) {
    return (
      <p className="text-[0.6875rem] leading-relaxed text-[var(--terrion-gold-600)]">
        Kalimat Anda menyebut lebih dari satu tujuan sekaligus. Pilih salah satu di atas supaya
        tidak salah baca.
      </p>
    )
  }

  if (!reading.objective) {
    return (
      <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
        Kami belum mengenali tujuan di kalimat itu. Pilih salah satu di atas — kalimatnya tetap
        tersimpan.
      </p>
    )
  }

  const copy = OBJECTIVE_COPY[reading.objective]

  return (
    <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
      Kalimat Anda dibaca sebagai{' '}
      <span className="font-semibold text-foreground">{copy.letter} · {copy.label}</span>, dari
      kata <span className="italic">{reading.matched.slice(0, 3).join(', ')}</span>. Rencana itu
      yang akan disusun, dan kalimatnya tetap dikirim utuh ke perencana. Kalau kelirunya di
      pembacaan ini, cukup pilih sendiri di atas.
    </p>
  )
}
