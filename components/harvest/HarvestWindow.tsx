import { cva, type VariantProps } from 'class-variance-authority'

import { formatHarvestRange } from '@/lib/harvest/format'
import { cn } from '@/lib/utils'
import type { HarvestWindow as HarvestWindowData } from '@/lib/agronomy/types'

/**
 * The only component in the codebase allowed to render a harvest date.
 *
 * A harvest is a range, never a day. Anything that renders a bare date — a
 * table cell, a tooltip, the public plot page, the RDKK export — has to come
 * through here, or single dates leak back in and read as certainty the model
 * never claimed.
 */

const windowVariants = cva('inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5', {
  variants: {
    size: {
      sm: 'text-[0.8rem]',
      md: 'text-sm',
    },
  },
  defaultVariants: { size: 'md' },
})

/** An aggregated delivery week. A bucket, not a model prediction, so it
 *  carries no confidence figure -- there is no single window behind it. */
export type DeliveryWeek = {
  start: Date
  end: Date
  basis: 'observed' | 'climatology'
}

type Props = VariantProps<typeof windowVariants> & {
  /** Caller could not load weather at all; show the variety's own range instead. */
  degraded?: boolean
  className?: string
} & (
  | { window: HarvestWindowData | null; week?: never }
  | { week: DeliveryWeek; window?: never }
)

export function HarvestWindow({ window, week, size, degraded, className }: Props) {
  // A delivery week names a seven-day period, not a predicted harvest date, so
  // no confidence is shown. Climatology still has to announce itself: a week
  // resting on normals rather than observed weather is a rough estimate.
  if (week) {
    return (
      <span className={cn(windowVariants({ size }), className)}>
        <span className="font-medium text-foreground">
          {formatHarvestRange(week.start, week.end)}
        </span>
        {week.basis === 'climatology' && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            Perkiraan awal
          </span>
        )}
      </span>
    )
  }

  // No weather anywhere. Say so plainly rather than inventing a range.
  if (degraded || !window) {
    return (
      <span className={cn(windowVariants({ size }), 'text-muted-foreground', className)}>
        Data cuaca belum tersedia — menampilkan rentang varietas.
      </span>
    )
  }

  const range = formatHarvestRange(window.start, window.end)

  // The model disagrees with the variety's own published duration badly enough
  // that the dates are not trustworthy. Render them, but never with a
  // confidence figure attached — that is the fake certainty this guards against.
  if (window.plausibility === 'implausible') {
    return (
      <span className={cn(windowVariants({ size }), className)}>
        <span className="text-muted-foreground line-through decoration-destructive/60">
          {range}
        </span>
        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
          Data varietas perlu diperiksa
        </span>
      </span>
    )
  }

  // No confidence figure. The window is always the P10-P90 band, so the number
  // was 80% on every row of every screen -- and a figure that never varies is
  // read as a claim about THIS plot rather than as the fixed width it is. The
  // range is already the uncertainty; printing a constant beside it added
  // precision the reader could not act on, and after an already-matured block
  // collapsed to a single day it was actively wrong.
  return (
    <span className={cn(windowVariants({ size }), className)}>
      <span className="font-medium text-foreground">{range}</span>
      {window.basis === 'climatology' && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          Perkiraan awal
        </span>
      )}
    </span>
  )
}
