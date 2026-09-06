'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

import {
  AssignmentsTable, DoubtfulWindowsNote, type VarietyCatalogue,
} from '@/components/planning/AssignmentsTable'
import { CapacityThresholds } from '@/components/planning/CapacityThresholds'
import { FertiliserPlan } from '@/components/planning/FertiliserPlan'
import { PlanCandidateCard } from '@/components/planning/PlanCandidateCard'
import { BasisNote, LimitsNote, PlanProvenance } from '@/components/planning/PlanNotes'
import { PreviousSeason } from '@/components/planning/PreviousSeason'
import { SkippedPlots } from '@/components/planning/SkippedPlots'
import { SubsidyCapNote } from '@/components/planning/SubsidyCapNote'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/Card'
import { applyPlan } from '@/lib/planning/actions'
import { buildApplyRequest, countEdits, type AssignmentOverrides } from '@/lib/planning/apply'
import { OBJECTIVE_COPY } from '@/lib/planning/copy'
import { fromOverSubsidyCap } from '@/lib/planning/members'
import type { PlanObjective, ProposalResponse } from '@/lib/planning/types'
import { formatNumberId } from '@/lib/format/number'

/**
 * The propose screen: the plan the pengurus asked for, edited, applied.
 *
 * A Client Component for two reasons, both of which are in
 * `docs/INTEGRASI_FRONTEND.md`. First, `propose` stores nothing and a refresh
 * recomputes it — two to four seconds each time, and the stated goal is part
 * of the cache key — so what is on screen has to live in state rather than in
 * repeated calls. Second, the likeliest outcome of pressing "Terapkan" is a
 * refusal the pengurus is meant to read (`plan_already_applied` above all),
 * and a refusal belongs next to the button that caused it, not in an error
 * boundary that replaces the screen they just spent four seconds computing.
 *
 * The screen has two shapes, and which one appears depends on whether the
 * pengurus already said what they were after on the intake form:
 *
 *   they did      one plan, theirs, with its assignments ready to apply. The
 *                 other two were computed and are not shown: they answered the
 *                 question already, and asking it a second time with three
 *                 equal cards is the form undoing itself.
 *   they did not  three cards side by side, because there is a real choice
 *                 open and no basis for the system to make it for them.
 *
 * What it deliberately does not do: recompute anything. Every figure on this
 * screen came from Go, and an edited row stops showing figures altogether
 * rather than showing stale ones (see AssignmentsTable).
 */
export function ProposalView({
  proposal,
  varieties,
  commodities,
  initialObjective,
  statedGoal,
}: {
  proposal: ProposalResponse
  varieties: VarietyCatalogue
  /** Commodity id → name, for the thresholds and fertiliser lines. */
  commodities: Record<string, string>
  /** The objective the pengurus stated on the intake screen, if they did. */
  initialObjective?: PlanObjective | null
  /** Their own sentence — the one that was sent to the planner as `goal`. */
  statedGoal?: string
}) {
  const router = useRouter()
  const [objective, setObjective] = useState(
    initialObjective ?? proposal.plans[0]?.objective ?? 'aman',
  )
  // Keyed by plan objective: edits made while comparing "aman" must not follow
  // the reader into "pendapatan", where the same plot has a different row.
  const [overrides, setOverrides] = useState<Record<string, AssignmentOverrides>>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const plan = proposal.plans.find(p => p.objective === objective) ?? proposal.plans[0]
  const planOverrides = overrides[objective] ?? {}
  const edits = plan ? countEdits(plan, planOverrides) : 0

  if (!plan) {
    return (
      <Card pad="lg">
        <p className="text-sm text-muted-foreground">
          Perencana tidak mengembalikan satu pun rencana untuk musim ini.
        </p>
      </Card>
    )
  }

  const change = (plotId: string, patch: { variety_id?: string; planting_date?: string }) => {
    setOverrides(all => ({
      ...all,
      [objective]: {
        ...(all[objective] ?? {}),
        [plotId]: { ...(all[objective]?.[plotId] ?? {}), ...patch },
      },
    }))
  }

  const resetEdits = () => setOverrides(all => ({ ...all, [objective]: {} }))

  const apply = async () => {
    setPending(true)
    setError(null)
    try {
      const result = await applyPlan(buildApplyRequest(proposal.season, plan, planOverrides))
      // The refusal arrives as a value, not a throw: a thrown Server Action
      // reaches production as "Minified React error #441", and every sentence
      // in lib/planning/errors.ts was written to be read.
      if (!result.ok) { setError(result.message); return }
      router.push(`/rencana/${result.data.plan_id}`)
    } catch {
      setError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    } finally {
      setPending(false)
    }
  }

  const chosen = initialObjective !== null && initialObjective !== undefined

  return (
    <div className="flex flex-col gap-6">
      <BasisNote />
      {/* The planner's own sentence about what it does not know, verbatim. */}
      <LimitsNote limits={proposal.limits} />

      {statedGoal && <StatedGoal sentence={statedGoal} opened={initialObjective ?? null} />}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {chosen
              ? `Rencana ${OBJECTIVE_COPY[objective].label} untuk ${proposal.season.label}`
              : `Tiga rencana untuk ${proposal.season.label}`}
          </h2>
          <PlanProvenance
            engine={proposal.engine}
            yieldObservations={proposal.yield_observations}
          />
        </div>
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {chosen
            ? 'Ini rencana yang disusun dari tujuan yang Anda nyatakan. Periksa penugasannya di bawah, ubah yang perlu, lalu terapkan — atau kembali ke tujuan kalau yang Anda kejar ternyata lain.'
            : 'Ketiganya sah. Bedanya bukan mana yang paling benar, melainkan pertanyaan mana yang sedang dijawab — dan itu keputusan pengurus, bukan keputusan sistem.'}
        </p>

        {/* One plan when the pengurus already chose, three when they did not.
            There is no third layout: a chosen plan sitting beside the two it
            beat is the intake form asking its own question again. */}
        {chosen ? (
          <div className="flex flex-col gap-3">
            <PlanCandidateCard plan={plan} selected />
            <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
              Mau membandingkannya dengan tujuan lain?{' '}
              <Link href="/rencana/susun" className="interactive font-semibold hover:underline">
                Ubah tujuan lalu hitung ulang
              </Link>
              {' '}— perhitungannya ikut berubah, jadi ini bukan sekadar berpindah kartu.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {proposal.plans.map(candidate => (
              <PlanCandidateCard
                key={candidate.objective}
                plan={candidate}
                selected={candidate.objective === objective}
                onSelect={() => setObjective(candidate.objective)}
              />
            ))}
          </div>
        )}

        <PreviousSeason previous={proposal.previous_season} metrics={plan.metrics} />
      </section>

      <Card pad="lg" className="flex flex-col gap-4">
        <CardHeader
          title={`Penugasan rencana ${OBJECTIVE_COPY[plan.objective].label}`}
          description="Ubah varietas atau tanggal tanam mana pun sebelum menerapkan. Sistem mengusulkan; pengurus yang memutuskan."
          actions={
            edits > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetEdits}>
                <RotateCcw aria-hidden className="size-3.5" />
                Kembalikan {edits} perubahan
              </Button>
            ) : undefined
          }
        />

        <CapacityThresholds
          thresholds={plan.thresholds}
          flagged={plan.flagged}
          commodities={commodities}
        />

        <FertiliserPlan
          lines={plan.fertiliser}
          unrated={plan.fertiliser_unrated}
          commodities={commodities}
        />

        <SubsidyCapNote members={fromOverSubsidyCap(plan.over_subsidy_cap)} limit={4} />

        <DoubtfulWindowsNote assignments={plan.assignments} />

        <AssignmentsTable
          assignments={plan.assignments}
          overrides={planOverrides}
          onChange={change}
          varieties={varieties}
          plantingFrom={proposal.season.planting_from}
          plantingTo={proposal.season.planting_to}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            Menerapkan rencana ini menuliskan {formatNumberId(plan.assignments.length, 0)} blok
            tanam untuk {proposal.season.label}. Blok itu ditandai sebagai berasal dari rencana,
            terpisah dari catatan kader, dan bisa dibatalkan seluruhnya nanti.
          </p>
          <Button type="button" size="lg" onClick={apply} disabled={pending}>
            {pending ? 'Menerapkan…' : `Terapkan rencana ${OBJECTIVE_COPY[plan.objective].label}`}
          </Button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </Card>

      <SkippedPlots skipped={proposal.skipped} />
    </div>
  )
}

/**
 * What the pengurus said they wanted, quoted back beside what it did.
 *
 * The screen has to be exact about the size of its own effect, and that size
 * changed when `goal` started travelling to the backend: the sentence now
 * shifts how strongly the objective is weighted, so the plan below genuinely
 * was computed with it. What it still does not do is produce a number — every
 * tonne, rupiah and date comes from the deterministic solver — and that stays
 * on the screen, because it is the difference between a planner and an oracle.
 */
function StatedGoal({ sentence, opened }: { sentence: string; opened: PlanObjective | null }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-3">
      <p className="text-xs leading-relaxed text-foreground">
        <span className="text-muted-foreground">Tujuan Anda: </span>
        <span className="italic">&ldquo;{sentence}&rdquo;</span>
      </p>
      <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted-foreground">
        {opened
          ? `Kalimat itu dikirim ke perencana dan menggeser penekanan rencana ${OBJECTIVE_COPY[opened].letter} · ${OBJECTIVE_COPY[opened].label} di bawah. Angkanya sendiri tetap dihitung solver, bukan model bahasa.`
          : 'Kalimat itu dikirim ke perencana dan menggeser penekanannya, tetapi belum terbaca sebagai salah satu dari tiga tujuan — jadi ketiga rencananya ditampilkan untuk Anda pilih.'}
      </p>
    </div>
  )
}
