import Link from 'next/link'
import { redirect } from 'next/navigation'

import { BasisNote } from '@/components/planning/PlanNotes'
import { PlanIntake } from '@/components/planning/PlanIntake'
import { ProposalView } from '@/components/planning/ProposalView'
import type { VarietyCatalogue } from '@/components/planning/AssignmentsTable'
import { SeasonPicker } from '@/components/planning/SeasonPicker'
import { SkippedPlots } from '@/components/planning/SkippedPlots'
import { buttonVariants } from '@/components/ui/button'
import { Card, MessageCard } from '@/components/ui/Card'
import { Page, PageHeader } from '@/components/ui/Page'
import { utcDate } from '@/lib/agronomy/dates'
import { currentAppUser, currentSessionId } from '@/lib/auth/session'
import { loadCommodities } from '@/lib/commodities/load'
import { formatDateId } from '@/lib/harvest/format'
import { ApiError } from '@/lib/api/client'
import { isKnownPlanError, planErrorMessage } from '@/lib/planning/errors'
import { parseObjective } from '@/lib/planning/goal'
import { loadProposal } from '@/lib/planning/load'
import { defaultSeason, upcomingSeasons } from '@/lib/planning/season'
import type { ProposalResponse } from '@/lib/planning/types'

export const metadata = { title: 'Susun rencana tanam' }

// Nothing about a proposal may be cached: it is computed fresh per request by
// construction, and a stale one would be a plan for a season that has moved.
export const dynamic = 'force-dynamic'

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * The screen where next season is decided.
 *
 * Two states, and the URL says which: without `?season=` it is a season
 * picker, with one it is three plans. Keeping the season in the address rather
 * than in state means a computed proposal can be reloaded and shared, and it
 * lets this stay a Server Component so the four-second call happens on the
 * server with `loading.tsx` covering it.
 *
 * The pengurus's own sentence travels with the season as `goal`, and it is
 * part of what makes the call slow and uncacheable: a different sentence is a
 * different computation, not a different view of the same one.
 *
 * Every refusal `propose` can give is a fact about the cooperative rather than
 * a fault -- no plots yet, no climate normals for their grid cell, the season
 * already planned, the planting window already closed. So the known ones are
 * drawn inside the page, next to the picker that lets the reader try another
 * season. Only a genuine fault is left to the error boundary.
 */
export default async function ProposePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  // Proposing and applying are pengurus work. A kader who follows the URL is
  // sent to the list, which is theirs to read.
  if (user.role !== 'pengurus') redirect('/rencana')

  const params = await searchParams
  const season = one(params.season)?.trim()
  const stated = parseObjective(one(params.tujuan))
  const sentence = one(params.kalimat)?.trim()
  const seasons = upcomingSeasons(new Date())
  const suggested = defaultSeason(new Date()).label

  if (!season) {
    return (
      <Page width="doc" className="flex flex-col gap-6">
        <Header />
        <BasisNote />
        <Card pad="lg" className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Mulai dari sini</h2>
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
              Perencana bekerja atas lahan yang sudah terdaftar, dan menyusun tiga usulan untuk
              satu musim tanam penuh. Menghitungnya memakan beberapa detik.
            </p>
          </div>
          <PlanIntake
            seasons={seasons}
            suggested={suggested}
            initialObjective={stated}
            initialSentence={sentence}
          />
        </Card>
      </Page>
    )
  }

  let proposal: ProposalResponse
  try {
    proposal = await loadProposal(await currentSessionId(), season, sentence)
  } catch (error) {
    if (!isKnownPlanError(error)) throw error
    return (
      <Page width="doc" className="flex flex-col gap-6">
        <Header />
        <MessageCard title={`Rencana untuk ${season} belum bisa disusun`}>
          {planErrorMessage(error)}
        </MessageCard>
        {isGoalTooLong(error) ? (
          // Their sentence is the thing that was refused, so the way back is
          // the form that still holds it -- not a season picker, and certainly
          // not a blank box they have to retype a paragraph into.
          <Card pad="lg" className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Persingkat tujuan Anda</h2>
            <PlanIntake
              seasons={seasons}
              suggested={season}
              initialObjective={stated}
              initialSentence={sentence}
            />
          </Card>
        ) : (
          <Card pad="lg" className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Coba musim lain</h2>
            <SeasonPicker seasons={seasons} current={season} />
          </Card>
        )}
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/rencana" className="interactive font-semibold hover:underline">
            Kembali ke daftar rencana
          </Link>
        </p>
      </Page>
    )
  }

  // A cooperative can have plots, climate normals and still no plan worth
  // showing -- every plot skipped for a reason of its own. The reasons are the
  // whole answer in that case, so they get the screen.
  if (proposal.plans.length === 0) {
    return (
      <Page width="doc" className="flex flex-col gap-6">
        <Header />
        <MessageCard title={`Tidak ada rencana yang bisa disusun untuk ${proposal.season.label}`}>
          Perencana tidak menemukan satu pun susunan tanam yang layak untuk musim ini.
        </MessageCard>
        <SkippedPlots skipped={proposal.skipped} />
        <Card pad="lg" className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Coba musim lain</h2>
          <SeasonPicker seasons={seasons} current={season} />
        </Card>
      </Page>
    )
  }

  // Only the varieties of the crops actually proposed, keyed by commodity: a
  // hand edit may change which variety of maize a plot grows, never turn the
  // maize into chilli. The commodity is the planner's decision and the yield
  // model is calibrated against it.
  const commodities = await loadCommodities()
  const varieties: VarietyCatalogue = Object.fromEntries(
    commodities.map(c => [c.id, c.varieties.map(v => ({ id: v.id, name: v.name }))]),
  )
  // Thresholds, flagged weeks and fertiliser lines name commodities by id.
  // Printing "c_7f21" beside a tonnage would make the one figure that answers
  // "menumpuk dibanding apa?" unreadable.
  const commodityNames: Record<string, string> = Object.fromEntries(
    commodities.map(c => [c.id, c.name]),
  )

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        title={`Rencana tanam ${proposal.season.label}`}
        description={
          `Tanam antara ${formatDateId(utcDate(proposal.season.planting_from))} dan `
          + `${formatDateId(utcDate(proposal.season.planting_to))}. `
          + 'Pilih satu dari tiga usulan, ubah yang perlu, lalu terapkan.'
        }
        actions={
          <Link href="/rencana" className={buttonVariants({ variant: 'outline' })}>
            Daftar rencana
          </Link>
        }
      />
      <ProposalView
        proposal={proposal}
        varieties={varieties}
        commodities={commodityNames}
        initialObjective={stated}
        statedGoal={sentence}
      />
    </Page>
  )
}

/** The one refusal whose remedy is the form, not the season. */
function isGoalTooLong(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'plan_goal_too_long'
}

function Header() {
  return (
    <PageHeader
      title="Susun rencana tanam"
      description="Keputusan yang menentukan harga jatuh atau tidak diambil sebelum tanam. Di sinilah tempatnya."
      actions={
        <Link href="/rencana" className={buttonVariants({ variant: 'outline' })}>
          Daftar rencana
        </Link>
      }
    />
  )
}
