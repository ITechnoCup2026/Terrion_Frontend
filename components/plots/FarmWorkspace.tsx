'use client'

import { useMemo, useState, type ReactNode } from 'react'

import { TimeSlider } from '@/components/canvas/TimeSlider'
import { FarmShell } from '@/components/plots/FarmShell'
import { PlotStage, stageTimeline, type StageBlock } from '@/components/plots/PlotStage'
import type { FarmSummary } from '@/components/plots/FarmSummaryPanel'
import type { ReferenceCommodity, ReferenceVariety } from '@/components/plots/SplitBlockForm'

/**
 * A farm page: the canvas, the panel beside it, and the day both are showing.
 *
 * This exists to own one piece of state. The time slider sets which day the
 * crops are drawn at, and after the slider moved into the panel that state has
 * a control on one side of the layout and its effect on the other -- so it can
 * no longer live inside either. It lives here, in their nearest parent.
 *
 * Both farm pages use this: the signed-in plot page and the public garden.
 * They differ only in what they put in the panel, which is why that arrives as
 * children rather than as a growing list of props.
 */
export function FarmWorkspace({
  plotAreaHa, blocks, terrainSeed, summary, degraded, detail, editing,
  panelLabel, header, children,
}: {
  plotAreaHa: number
  blocks: StageBlock[]
  terrainSeed: number
  summary?: FarmSummary
  degraded: boolean
  detail?: 'block' | 'tile'
  editing?: {
    plotId: string
    commodities: ReferenceCommodity[]
    varieties: ReferenceVariety[]
  }
  panelLabel: string
  header?: ReactNode
  children: ReactNode
}) {
  // null means today. Set only by dragging the slider.
  const [viewDate, setViewDate] = useState<Date | null>(null)

  const { bounds, projectedFrom } = useMemo(() => stageTimeline(blocks), [blocks])

  return (
    <FarmShell
      panelLabel={panelLabel}
      header={header}
      footer={bounds && (
        <TimeSlider
          bounds={bounds}
          value={viewDate ?? new Date()}
          onChange={setViewDate}
          projectedFrom={projectedFrom}
          bare
        />
      )}
      canvas={
        <PlotStage
          plotAreaHa={plotAreaHa}
          blocks={blocks}
          terrainSeed={terrainSeed}
          summary={summary}
          degraded={degraded}
          detail={detail}
          editing={editing}
          viewDate={viewDate}
        />
      }
    >
      {children}
    </FarmShell>
  )
}
