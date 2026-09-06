import { notFound, redirect } from 'next/navigation'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import type { FarmSummary } from '@/components/plots/FarmSummaryPanel'
import { DeletePlotButton } from '@/components/plots/DeletePlotButton'
import { FarmWorkspace } from '@/components/plots/FarmWorkspace'
import type { StageBlock } from '@/components/plots/PlotStage'
import type { ReferenceCommodity, ReferenceVariety } from '@/components/plots/SplitBlockForm'
import { Badge } from '@/components/ui/Badge'
import { Page, PageHeader } from '@/components/ui/Page'
import { currentAppUser } from '@/lib/auth/session'
import { loadCommodities } from '@/lib/commodities/load'
import { formatDateId } from '@/lib/harvest/format'
import { commodityColour } from '@/lib/plots/colour'
import { loadPlot } from '@/lib/plots/load'

export default async function PlotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await currentAppUser()
  if (!user) redirect('/login')

  const [plot, commodityCatalogue] = await Promise.all([loadPlot(id), loadCommodities()])
  if (!plot) notFound()

  const varietyById = new Map(commodityCatalogue.flatMap(c => c.varieties.map(v => [v.id, v])))

  // Splitting a block is a write, and writes on a block belong to kaders and
  // pengurus. The action re-checks; this decides whether the button is even
  // offered, because a button that always refuses is worse than no button.
  const canEdit = user.role === 'kader' || user.role === 'pengurus'

  const stageBlocks: StageBlock[] = plot.blocks.map(b => ({
    id: b.id,
    areaHa: b.areaHa,
    orderIndex: b.orderIndex,
    label: `${b.label} · ${b.areaHa.toFixed(2)} ha`,
    color: commodityColour(b.spriteRow),
    spriteRow: b.spriteRow,
    stage: b.window?.stage ?? 0,
    commodityName: b.commodityName,
    plantingDateLabel: formatDateId(b.plantingDate),
    window: b.window,
    plantingDate: b.plantingDate.toISOString().slice(0, 10),
    gddRequired: b.window?.gddRequired ?? 0,
    varietyId: b.varietyId,
    commodityId: b.commodityId,
    // Signed-in only. The public garden gets the same blocks without this: a
    // price on a page anyone can open reads as an asking price, and the
    // cooperative has not offered one.
    price: b.price,
  }))

  // What the farmhouse popup shows: the totals the per-block panel does not.
  // Tonnage is a range because every variety publishes a range; collapsing it
  // to one number would put the only unmeasured figure on the screen.
  const starts = plot.blocks.map(b => b.window?.start).filter((d): d is Date => Boolean(d))
  const ends = plot.blocks.map(b => b.window?.end).filter((d): d is Date => Boolean(d))

  const summary: FarmSummary = {
    plotName: plot.name,
    memberName: plot.memberName || 'Petani tidak tercatat',
    areaHa: plot.areaHa,
    blockCount: plot.blocks.length,
    commodities: [...new Set(plot.blocks.map(b => b.commodityName))],
    publicId: plot.publicId,
    tonnesMin: plot.blocks.reduce((sum, b) => {
      const v = varietyById.get(b.varietyId)
      return sum + (v ? v.yieldPerHaMin * b.areaHa : 0)
    }, 0),
    tonnesMax: plot.blocks.reduce((sum, b) => {
      const v = varietyById.get(b.varietyId)
      return sum + (v ? v.yieldPerHaMax * b.areaHa : 0)
    }, 0),
    window: starts.length > 0 && ends.length > 0
      ? {
          start: new Date(Math.min(...starts.map(d => d.getTime()))),
          end: new Date(Math.max(...ends.map(d => d.getTime()))),
          basis: plot.blocks.some(b => b.window && b.window.basis !== 'observed')
            ? 'climatology' : 'observed',
        }
      : null,
  }

  const editingCommodities: ReferenceCommodity[] = commodityCatalogue.map(c => ({
    id: c.id, name: c.name,
  }))
  const editingVarieties: ReferenceVariety[] = commodityCatalogue.flatMap(c =>
    c.varieties.map(v => ({ id: v.id, commodity_id: v.commodityId, name: v.name })))

  return (
    // The farm IS the screen. AppShell puts this route in its immersive frame,
    // so this fills the viewport exactly and nothing above it adds padding or
    // a scrollbar. FarmWorkspace then splits it the way the Atlas is split:
    // the picture on one side, everything said about it on the other.
    <main className="relative h-full w-full overflow-hidden">
      {stageBlocks.length > 0 ? (
        <FarmWorkspace
          plotAreaHa={plot.areaHa}
          blocks={stageBlocks}
          terrainSeed={plot.terrainSeed}
          summary={summary}
          degraded={plot.degraded}
          editing={canEdit
            ? { plotId: plot.id, commodities: editingCommodities, varieties: editingVarieties }
            : undefined}
          panelLabel={`Rincian ${plot.name}`}
          header={
            <div className="shrink-0 border-b border-border px-4 py-3">
              <h1 className="text-lg font-semibold text-foreground">{plot.name}</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {plot.memberName || 'Petani tidak tercatat'}
              </p>
            </div>
          }
        >
          <section className="border-b border-border px-4 py-4">
            <h2 className="text-xs font-medium text-muted-foreground">Lahan ini</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                ['Luas', `${plot.areaHa.toFixed(2)} ha`],
                ['Blok', String(stageBlocks.length)],
                [
                  'Perkiraan hasil',
                  summary.tonnesMin > 0 || summary.tonnesMax > 0
                    ? `${summary.tonnesMin.toFixed(1)}–${summary.tonnesMax.toFixed(1)} t`
                    : '—',
                ],
                ['Kode publik', plot.publicId],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[0.6875rem] text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 text-base leading-none font-semibold tabular-nums text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Only a pengurus, and only at the foot of the facts about this
                plot -- deleting a registration is the one thing on this screen
                that cannot be undone, so it does not sit near the canvas
                controls somebody is clicking through. */}
            {user.role === 'pengurus' && (
              <div className="mt-4 border-t border-border pt-3">
                <DeletePlotButton
                  plotId={plot.id}
                  plotName={plot.name}
                  blocks={stageBlocks.length}
                />
                <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-muted-foreground">
                  Untuk lahan yang salah didaftarkan. Lahan yang sudah punya panen tercatat
                  tidak bisa dihapus.
                </p>
              </div>
            )}
          </section>

          {/* One row per field. The canvas colours each block and this is the
              key to those colours, so a reader can look from one to the other
              without counting rectangles. */}
          <section className="px-4 py-4">
            <h2 className="text-xs font-medium text-muted-foreground">Blok tanam</h2>
            <ul className="mt-3 flex list-none flex-col gap-3">
              {plot.blocks.map(block => (
                <li key={block.id} className="flex flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: commodityColour(block.spriteRow) }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {block.commodityName}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {block.areaHa.toFixed(2)} ha
                    </span>
                  </span>
                  <span className="pl-[1.125rem] text-xs text-muted-foreground">
                    {block.label} · {block.fromPlan ? 'akan ditanam' : 'ditanam'}{' '}
                    {formatDateId(block.plantingDate)}
                  </span>
                  {/* Decision K3: a plan writes blocks, a kader records what is
                      actually in the field, and the two must never look alike.
                      "Ditanam 12 Nov" on a date that has not arrived is an
                      observation the cooperative never made. */}
                  {block.fromPlan && (
                    <span className="pl-[1.125rem]">
                      <Badge tone="neutral">Dari rencana tanam</Badge>
                    </span>
                  )}
                  <span className="pl-[1.125rem]">
                    <HarvestWindow window={block.window} degraded={plot.degraded} size="sm" />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </FarmWorkspace>
      ) : (
        <Page className="flex flex-col gap-4">
          <PageHeader
            title={plot.name}
            description={`${plot.areaHa.toFixed(2)} ha · kode publik ${plot.publicId}`}
          />
          <p className="text-sm text-muted-foreground">
            {plot.hasHarvestedBlocks
              ? 'Belum ada tanaman aktif — seluruh musim di lahan ini sudah dipanen.'
              : 'Lahan ini belum punya blok.'}
          </p>
        </Page>
      )}
    </main>
  )
}
