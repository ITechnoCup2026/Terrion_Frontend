import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { CancelPlanButton } from '@/components/planning/CancelPlanButton'
import { MemberShareList } from '@/components/planning/MemberShareList'
import { PlanItemsByMember } from '@/components/planning/PlanItemsByMember'
import { BasisNote } from '@/components/planning/PlanNotes'
import {
  CommodityBreakdown, HarvestSpread, ObjectiveTradeOff, PlanScale,
} from '@/components/planning/PlanSummary'
import { SubsidyCapNote } from '@/components/planning/SubsidyCapNote'
import { Badge } from '@/components/ui/Badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page, PageHeader } from '@/components/ui/Page'
import { utcDate } from '@/lib/agronomy/dates'
import { currentAppUser, currentSessionId } from '@/lib/auth/session'
import { formatNumberId } from '@/lib/format/number'
import { formatDateId } from '@/lib/harvest/format'
import { OBJECTIVE_COPY } from '@/lib/planning/copy'
import { loadPlan } from '@/lib/planning/load'
import { membersOverSubsidyCap } from '@/lib/planning/members'
import { commodityBreakdown, harvestByMonth, planTotals } from '@/lib/planning/summary'

export const metadata = { title: 'Detail rencana tanam' }

export const dynamic = 'force-dynamic'

/**
 * One saved plan, and the button that takes it back.
 *
 * This is where the thesis of the whole feature is checked: the blocks listed
 * here are the same blocks the dashboard projects, the RDKK sheet orders
 * fertiliser for, and the public catalogue lists as next season's supply --
 * without one line of those features having been changed. Cancelling releases
 * exactly these blocks and touches nothing a kader recorded.
 */
export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await currentAppUser()
  if (!user) redirect('/login')

  const plan = await loadPlan(await currentSessionId(), id)
  // 404 also means "belongs to another cooperative" by contract, and merging
  // the two is deliberate: a reader must not be able to probe ids.
  if (!plan) notFound()

  const applied = plan.status === 'applied'
  const totals = planTotals(plan.items)
  const liveBlocks = totals.liveBlocks
  const canCancel = user.role === 'pengurus' && applied && liveBlocks > 0
  const objective = OBJECTIVE_COPY[plan.objective]
  const overCap = membersOverSubsidyCap(plan.items)
  // Empty for a plan applied before the backend minted share tokens, and the
  // list renders nothing at all in that case rather than an empty panel
  // promising a feature this plan never had.
  const shares = plan.member_shares

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        title={`Rencana ${plan.season_label}`}
        description={
          `${formatDateId(utcDate(plan.season_start))} – ${formatDateId(utcDate(plan.season_end))}`
          + ` · rencana ${objective ? `${objective.letter} · ${objective.label}` : plan.objective}`
        }
        actions={
          <>
            <Link href="/rencana" className={buttonVariants({ variant: 'outline' })}>
              Daftar rencana
            </Link>
            {canCancel && <CancelPlanButton planId={plan.id} blocks={liveBlocks} />}
          </>
        }
      />

      <Card pad="lg" className="flex flex-col gap-4">
        <CardHeader
          title="Keadaan rencana"
          description={objective?.question}
          actions={
            applied
              ? <Badge tone="positive">Berjalan</Badge>
              : <Badge tone="neutral">Dibatalkan</Badge>
          }
        />
        {objective && <ObjectiveTradeOff objective={plan.objective} />}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Fact label="Penugasan" value={`${formatNumberId(plan.items.length, 0)} lahan`} />
          <Fact
            label="Blok tanam aktif"
            value={`${formatNumberId(liveBlocks, 0)} blok`}
            hint={
              applied
                ? 'Blok inilah yang muncul di dasbor, RDKK, dan katalog'
                : 'Blok sudah dilepas saat rencana dibatalkan'
            }
          />
          <Fact label="Disusun" value={formatDateId(utcDate(plan.created_at))} />
          <Fact
            label="Dibatalkan"
            value={plan.cancelled_at ? formatDateId(utcDate(plan.cancelled_at)) : '—'}
          />
        </dl>

        {plan.items.length > 0 && (
          <div className="border-t border-border/70 pt-4">
            <PlanScale totals={totals} />
          </div>
        )}

        <SubsidyCapNote members={overCap} limit={4} />

        {applied && (
          <p className="rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            Blok yang lahir dari rencana ini ditandai terpisah dari catatan kader di layar lahan.
            Membatalkan rencana melepas blok-blok itu saja — panen dan catatan lapangan tidak ikut
            terhapus.
          </p>
        )}
      </Card>

      <BasisNote />

      {plan.items.length === 0 ? (
        <EmptyState
          title="Rencana ini tidak punya penugasan"
          description="Tidak ada satu pun lahan tercatat pada rencana ini."
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <HarvestSpread months={harvestByMonth(plan.items)} />
            <CommodityBreakdown rows={commodityBreakdown(plan.items)} />
          </div>
          <PlanItemsByMember items={plan.items} />

          {/* Below the assignments, because it is what you do after reading
              them: the plan is decided upstairs, this is the round of phone
              calls that tells the people it is about. */}
          <MemberShareList
            shares={shares}
            seasonLabel={plan.season_label}
            cooperativeName={user.organisation}
            status={plan.status}
          />
        </>
      )}
    </Page>
  )
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</dd>
      {hint && <p className="mt-0.5 text-[0.6875rem] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  )
}
