'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { PlotCanvas } from '@/components/canvas/PlotCanvas'
import { FRAME_TILES_DESKTOP, FRAME_TILES_MOBILE, frameFarm } from '@/lib/canvas/frame'
import { scaleStep } from '@/lib/canvas/view'
import { AnchoredPanel } from '@/components/ui/AnchoredPanel'
import type { Point } from '@/lib/ui/anchor'
import { loadCrops } from '@/lib/canvas/crops'
import type { BlockStyle } from '@/lib/canvas/renderer'
import { loadTerrainSheets, type TerrainSheets } from '@/lib/canvas/sheets'
import { stageOn, timelineBounds, type TimelineBounds } from '@/lib/canvas/timeline'
import { generateTerrain } from '@/lib/terrain/generate'
import type { HarvestWindow as HarvestWindowData } from '@/lib/agronomy/types'
import type { PriceBenchmark } from '@/lib/price/benchmark'
import { allocateTiles } from '@/lib/tilegrid/allocate'
import type { TileHit } from '@/lib/canvas/hittest'
import { BlockDetailPanel } from './BlockDetailPanel'
import { PlantDetailPanel } from './PlantDetailPanel'
import type { ReferenceCommodity, ReferenceVariety } from './SplitBlockForm'
import { FarmSummaryPanel, type FarmSummary } from './FarmSummaryPanel'

export type StageBlock = {
  id: string
  areaHa: number
  orderIndex: number
  label: string
  color: string
  spriteRow: number
  /** From the prediction, so the sprite shows how grown the crop really is. */
  stage: number
  commodityName: string
  plantingDateLabel: string
  window: HarvestWindowData | null
  /** Planting date and GDD requirement, so the slider can resolve any date
   *  in the browser without asking the server. */
  plantingDate: string
  gddRequired: number
  /** Only the signed-in plot page passes these: they are what the edit form
   *  prefills from, and the public garden has no edit form. */
  varietyId?: string
  commodityId?: string
  /** Only the public garden passes these, because only its panel says them. */
  varietyName?: string | null
  yieldRangeTonnes?: { min: number; max: number } | null
  /** Only the signed-in plot page passes this. The public garden deliberately
   *  does not: a price on a page anyone can open reads as an offer. */
  price?: PriceBenchmark | null
}

const MOBILE_MAX_PX = 640

/** One tile, in canvas pixels. Passed to the canvas explicitly rather than
 *  left to its default, because the framing maths here has to agree with it. */
const CELL_PX = 32

/** What the reader has open: one block, the farmhouse, or nothing. */
type Selection =
  | { kind: 'block'; blockId: string; at: Point; tile: TileHit | null }
  | { kind: 'house'; at: Point }
  | null

// Client wrapper around the canvas: the page computes blocks on the server,
// this owns the sprite sheets, the generated scenery and the open panel.
export function PlotStage({
  plotAreaHa, blocks, terrainSeed, summary, degraded,
  detail = 'block', editing, viewDate,
}: {
  plotAreaHa: number
  blocks: StageBlock[]
  terrainSeed: number
  /** Absent on the public page: the roll-up is internal, and the link it
   *  offers points back at the page the reader is already on. */
  summary?: FarmSummary
  degraded: boolean
  /** What a tap opens.
   *
   *  'block' is the working view: one panel per field, with the split form
   *  behind it for readers who may write.
   *
   *  'tile' is the public garden's view: the panel describes the single square
   *  that was tapped. The diagram already draws a crop per square, so a tap
   *  that could only name the field was answering a question the reader had
   *  not asked. */
  detail?: 'block' | 'tile'
  /** The reference lists the split form needs, passed only when the viewer is
   *  allowed to write. Absent on the public garden page, which is why that
   *  page never ships a commodity list to the browser. */
  editing?: {
    plotId: string
    commodities: ReferenceCommodity[]
    varieties: ReferenceVariety[]
  }
  /** Which day to draw the crops at, or null for today.
   *
   *  Owned by the page rather than by this component, because the control that
   *  sets it is the time slider and that now lives in the page's panel. A
   *  canvas cannot hold state a sibling has to read. */
  viewDate: Date | null
}) {
  // One selection, not two booleans: a block and the farmhouse are alternative
  // answers to the same click, so "opening one closes the other" is a property
  // of the state rather than a rule two setters have to remember.
  const [selection, setSelection] = useState<Selection>(null)
  const [crops, setCrops] = useState<HTMLImageElement | null>(null)
  const [sheets, setSheets] = useState<TerrainSheets | null>(null)
  // How big the stage actually is, measured. The scenery is generated to cover
  // it, so the world cannot be sized until the box is.
  const stageRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ width: number; height: number } | null>(null)
  const [margin, setMargin] = useState(FRAME_TILES_DESKTOP)

  // Both loaders resolve to null rather than rejecting, so a missing sheet
  // leaves the canvas drawing its clean grid instead of throwing mid-render.
  useEffect(() => {
    let alive = true
    loadCrops().then(img => { if (alive) setCrops(img) })
    loadTerrainSheets().then(s => { if (alive) setSheets(s) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`)
    const apply = () => setMargin(query.matches ? FRAME_TILES_MOBILE : FRAME_TILES_DESKTOP)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  // Rounded, so a one-pixel resize does not regenerate the whole landscape.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const apply = () => setBox(prev => {
      const width = Math.round(el.clientWidth)
      const height = Math.round(el.clientHeight)
      if (width === 0 || height === 0) return prev
      return prev && prev.width === width && prev.height === height
        ? prev
        : { width, height }
    })
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const layout = useMemo(
    () => allocateTiles({
      plotAreaHa,
      blocks: blocks.map(({ id, areaHa, orderIndex }) => ({ id, areaHa, orderIndex })),
    }),
    [plotAreaHa, blocks],
  )

  // How much world to make, and where to point the camera. The camera frames
  // the field; the scenery is then generated to cover whatever is left of the
  // screen, so there is no page background showing around the farm.
  const frame = useMemo(
    () => box && frameFarm({
      plotCols: layout.cols,
      plotRows: layout.rows,
      cellPx: CELL_PX,
      width: box.width,
      height: box.height,
      step: scaleStep(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1),
      margin,
    }),
    [box, layout.cols, layout.rows, margin],
  )

  // Same seed, same landscape, forever -- and nothing is stored per cell.
  // Null until the stage has been measured: generating a world for a box of
  // unknown size would only be thrown away a frame later.
  const terrain = useMemo(
    () => frame && generateTerrain(terrainSeed, layout.cols, layout.rows, frame.border),
    [terrainSeed, layout.cols, layout.rows, frame],
  )

  // Stages come from the server for today, and from the series while scrubbing.
  // Recomputing them is a binary search per block, so a drag re-rasterises the
  // crop layer and touches the network not at all.
  const styles = useMemo(
    () => new Map<string, BlockStyle>(blocks.map(b => [b.id, {
      blockId: b.id,
      label: b.label,
      color: b.color,
      spriteRow: b.spriteRow,
      stage: viewDate
        ? stageOn({
            plantingDate: new Date(b.plantingDate),
            gddRequired: b.gddRequired,
            cumulativeGdd: b.window?.cumulativeGdd ?? [],
          }, viewDate)
        : b.stage,
    }])),
    [blocks, viewDate],
  )

  const selectedBlock = selection?.kind === 'block'
    ? blocks.find(b => b.id === selection.blockId) ?? null
    : null

  // Which square within its own block, counting from one.
  //
  // A block's tiles are contiguous in the grid's reading order but not in
  // memory -- the fields are packed as rectangles, so a block's rows are
  // separated by whatever else shares the shelf. Counting is therefore a scan
  // rather than arithmetic on startTile. It runs once per tap over at most
  // MAX_TILES squares, which is nothing.
  const tileFacts = useMemo(() => {
    const hit = selection?.kind === 'block' ? selection.tile : null
    if (!hit) return null
    const v = hit.blockIndex + 1
    let ordinal = 0
    let tileCount = 0
    for (let i = 0; i < layout.tiles.length; i++) {
      if (layout.tiles[i] !== v) continue
      tileCount++
      if (i <= hit.index) ordinal++
    }
    return { ordinal, tileCount }
  }, [selection, layout])

  return (
    <div ref={stageRef} className="relative h-full w-full overflow-hidden">
      <PlotCanvas
        layout={layout}
        styles={styles}
        crops={crops}
        cellPx={CELL_PX}
        terrain={terrain}
        sheets={sheets}
        initialView={frame?.view ?? null}
        onSelectBlock={(blockId, at, tile) =>
          setSelection(blockId && at ? { kind: 'block', blockId, at, tile } : null)}
        selectedBlockId={selectedBlock?.id ?? null}
        onSelectHouse={summary ? at => setSelection({ kind: 'house', at }) : undefined}
      />

      {/* Panels open AT the pointer rather than parked in a corner. A popup in
          the bottom-left describing a tile in the top-right makes the reader
          carry the connection themselves. */}
      {selection?.kind === 'house' && summary && (
        <AnchoredPanel
          point={selection.at}
          label={`Ringkasan ${summary.plotName}`}
          onClose={() => setSelection(null)}
        >
          <FarmSummaryPanel
            summary={summary} degraded={degraded} onClose={() => setSelection(null)}
          />
        </AnchoredPanel>
      )}

      {selection?.kind === 'block' && selectedBlock && (
        <AnchoredPanel
          point={selection.at}
          label={`Rincian ${selectedBlock.label}`}
          onClose={() => setSelection(null)}
        >
          {detail === 'tile' && tileFacts ? (
            <PlantDetailPanel
              block={selectedBlock}
              tileSizeM2={layout.tileSizeM2}
              ordinal={tileFacts.ordinal}
              tileCount={tileFacts.tileCount}
              degraded={degraded}
              onClose={() => setSelection(null)}
            />
          ) : (
            <BlockDetailPanel
              block={selectedBlock} degraded={degraded} editing={editing}
              onClose={() => setSelection(null)}
            />
          )}
        </AnchoredPanel>
      )}
    </div>
  )
}

/**
 * The span a farm's time slider covers, and where its weather runs out.
 *
 * Lives here rather than in the page because it is derived from StageBlock,
 * which is this module's shape. Returns bounds of null when no block carries a
 * daily GDD series: a track with nothing to scrub would be a lie, and that is
 * what hides the control.
 */
export function stageTimeline(blocks: StageBlock[]): {
  bounds: TimelineBounds | null
  projectedFrom: Date | null
} {
  const bounds = timelineBounds(blocks.map(b => ({
    plantingDate: new Date(b.plantingDate),
    gddRequired: b.gddRequired,
    cumulativeGdd: b.window?.cumulativeGdd ?? [],
  })))

  // Earliest projection start across blocks, so the slider marks the first
  // date any of them stops resting on real weather. A block still fully
  // inside known weather contributes null and does not affect this.
  const starts = blocks
    .map(b => b.window?.projectedFrom ?? null)
    .filter((d): d is Date => d !== null)

  return {
    bounds,
    projectedFrom: starts.length > 0
      ? new Date(Math.min(...starts.map(d => d.getTime())))
      : null,
  }
}
