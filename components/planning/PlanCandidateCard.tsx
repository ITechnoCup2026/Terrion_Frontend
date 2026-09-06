'use client'

import { ArrowDownRight, ArrowUpRight, Check } from 'lucide-react'

import { CapacityBadge, PlanMetrics } from '@/components/planning/PlanMetrics'
import { SubsidyCapNote } from '@/components/planning/SubsidyCapNote'
import { OBJECTIVE_COPY } from '@/lib/planning/copy'
import { fromOverSubsidyCap } from '@/lib/planning/members'
import type { CandidatePlanResponse } from '@/lib/planning/types'
import { cn } from '@/lib/utils'

/**
 * One of the three candidate plans, as a card the pengurus picks between.
 *
 * There are three and not one because the trade-off is theirs to make, not the
 * system's: a plan that keeps the peak week under the warehouse's capacity is
 * not the same plan as the one worth the most money, and neither is the one
 * that fills the buyer contracts already signed. Each card leads with the
 * question it answers, so the choice reads as a question about the cooperative
 * rather than a ranking with a winner.
 *
 * `narrative` is optional by contract. It may be prose from the AI service, it
 * may be a template, and the backend does not say which — nor should the
 * screen. When it is empty the card falls back to the objective's own
 * description and the layout does not move.
 *
 * The card states what the plan gives up as plainly as what it gains. Three
 * cards that each listed only their strengths would be three adverts, and the
 * pengurus would be left to work out the cost from the numbers — which is
 * exactly the work the screen exists to do for them.
 */
export function PlanCandidateCard({
  plan,
  selected,
  onSelect,
}: {
  plan: CandidatePlanResponse
  selected: boolean
  /** Omitted when this is the only plan on screen: nothing left to choose. */
  onSelect?: () => void
}) {
  const copy = OBJECTIVE_COPY[plan.objective]
  const overCap = fromOverSubsidyCap(plan.over_subsidy_cap)
  // A card with nowhere to go is not a button. When the pengurus has already
  // stated their goal there is one plan on screen and no choice being offered
  // here, and rendering it as a control anyway would promise one.
  const Tag = onSelect ? 'button' : 'div'

  return (
    <Tag
      {...(onSelect ? { type: 'button' as const, onClick: onSelect, 'aria-pressed': selected } : {})}
      className={cn(
        'flex h-full flex-col gap-4 rounded-lg border bg-card p-4 text-left shadow-[var(--shadow-xs)] transition-all',
        onSelect && 'interactive focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
        selected
          ? 'border-[var(--terrion-green-500)] ring-1 ring-[var(--terrion-green-500)]/30'
          : cn('border-border', onSelect && 'hover:border-[var(--terrion-green-300)]'),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span className="text-muted-foreground">{copy.letter}</span>
            <span aria-hidden className="text-muted-foreground/60">·</span>
            {copy.label}
            {selected && <Check aria-hidden className="size-3.5 text-[var(--terrion-green-700)]" />}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.question}</p>
        </div>
        <CapacityBadge flaggedWeeks={plan.metrics.flagged_weeks} />
      </div>

      <p className="text-xs leading-relaxed text-foreground/90">
        {plan.narrative.trim() || copy.detail}
      </p>

      <div className="border-t border-border/70 pt-3.5">
        <PlanMetrics metrics={plan.metrics} />
      </div>

      <TradeOff optimises={copy.optimises} sacrifices={copy.sacrifices} />

      <SubsidyCapNote members={overCap} />

      {onSelect && (
        <p className="mt-auto pt-1 text-[0.6875rem] font-medium text-muted-foreground">
          {selected ? 'Rencana ini sedang ditampilkan di bawah' : 'Klik untuk melihat penugasannya'}
        </p>
      )}
    </Tag>
  )
}

/**
 * The two halves of the choice, side by side and in the same type size.
 *
 * Weighting these differently would be an opinion the planner is not entitled
 * to: all three plans are valid, and which cost is acceptable is the
 * cooperative's decision, not the solver's.
 */
function TradeOff({ optimises, sacrifices }: { optimises: string; sacrifices: string }) {
  return (
    <dl className="flex flex-col gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
      <div className="flex gap-2">
        <ArrowUpRight
          aria-hidden
          className="mt-px size-3.5 shrink-0 text-[var(--terrion-green-700)]"
        />
        <div className="min-w-0">
          <dt className="text-[0.6875rem] font-medium text-muted-foreground">
            Yang dioptimalkan
          </dt>
          <dd className="text-[0.6875rem] leading-snug text-foreground/90">{optimises}</dd>
        </div>
      </div>
      <div className="flex gap-2">
        <ArrowDownRight
          aria-hidden
          className="mt-px size-3.5 shrink-0 text-[var(--terrion-gold-600)]"
        />
        <div className="min-w-0">
          <dt className="text-[0.6875rem] font-medium text-muted-foreground">
            Yang dikorbankan
          </dt>
          <dd className="text-[0.6875rem] leading-snug text-foreground/90">{sacrifices}</dd>
        </div>
      </div>
    </dl>
  )
}
