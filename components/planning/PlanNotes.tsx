import { Info, TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { BASIS_NOTE, calibrationNote, engineNote } from '@/lib/planning/copy'
import { cn } from '@/lib/utils'

/**
 * The standing line above every planner screen: what these figures rest on.
 *
 * This is principle P2 made visible. Next season's weather has not happened,
 * so every window here is simulated against a ten-year climate normal — and
 * that has to be on the screen, at the top, not in a footnote a pengurus
 * scrolls past. A tidy table of dates reads as certainty otherwise, and a
 * cooperative that treats a plan as a promise will sell against it.
 */
export function BasisNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground',
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{BASIS_NOTE}</span>
    </p>
  )
}

/**
 * The planner's own statement of what it does not know.
 *
 * `limits` is one sentence written by the backend for this exact proposal, and
 * it reaches the screen unchanged. Rewriting it here would put this app in the
 * position of deciding how much doubt a pengurus is allowed to see about a
 * plan they are about to commit a season to — and the sentence moves when the
 * inputs move, so a paraphrase would go stale silently.
 */
export function LimitsNote({ limits, className }: { limits: string; className?: string }) {
  if (!limits.trim()) return null

  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg border border-[var(--terrion-gold-500)]/40 bg-[var(--terrion-gold-50)]/50 px-3.5 py-2.5 text-xs leading-relaxed text-foreground/90',
        className,
      )}
    >
      <TriangleAlert
        aria-hidden
        className="mt-0.5 size-3.5 shrink-0 text-[var(--terrion-gold-600)]"
      />
      <span>{limits}</span>
    </p>
  )
}

/**
 * Which solver answered, and how much recorded harvest stands behind the
 * numbers.
 *
 * `engine: "fallback"` is deliberately drawn as a neutral pill and nothing
 * else. It is not a degraded state to the reader: the plan is complete, the
 * figures are Go's own, and the only difference is which process searched the
 * space. A red banner here would teach a pengurus to distrust a perfectly good
 * plan.
 */
export function PlanProvenance({
  engine,
  yieldObservations,
  className,
}: {
  engine: string
  yieldObservations: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      <Badge tone="neutral">{engineNote(engine)}</Badge>
      <span className="text-xs text-muted-foreground">
        {calibrationNote(yieldObservations)}
      </span>
    </div>
  )
}
