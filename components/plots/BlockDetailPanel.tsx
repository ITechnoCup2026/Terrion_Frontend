'use client'

import { useState } from 'react'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format/rupiah'
import { formatDateId } from '@/lib/harvest/format'
import { formatSeasonalGap, seasonalGap, type PriceBenchmark } from '@/lib/price/benchmark'
import { EditBlockForm } from './EditBlockForm'
import { RecordHarvestForm } from './RecordHarvestForm'
import {
  SplitBlockForm, type ReferenceCommodity, type ReferenceVariety,
} from './SplitBlockForm'
import type { StageBlock } from './PlotStage'

/**
 * One block, opened by clicking it on the canvas.
 *
 * Shows only what is recorded or computed: the crop, the area, when it went in
 * and the window it is predicted to come out. The harvest goes through
 * HarvestWindow like every other date in the product, so a range stays a range.
 *
 * Contents only. AnchoredPanel owns the frame and the position, because where
 * this belongs is next to the tile that was clicked -- which this component
 * cannot know and the canvas can.
 *
 * It has a second face: `Pecah blok`, which swaps these details for the form
 * that carves part of this block off for a different crop. Same panel, same
 * position, because it is the same piece of ground being talked about.
 */
export function BlockDetailPanel({
  block, degraded, onClose, editing,
}: {
  block: StageBlock
  degraded: boolean
  onClose: () => void
  /** Absent for readers who cannot write -- the public garden, and any role
   *  below kader. The action checks the role too; this only hides a button
   *  that would refuse. */
  editing?: {
    plotId: string
    commodities: ReferenceCommodity[]
    varieties: ReferenceVariety[]
  }
}) {
  // One face at a time. A block is either being read, being split, or being
  // closed off with a harvest -- and each of the three replaces the panel
  // rather than stacking inside it, because they are all about the same field.
  const [face, setFace] = useState<'details' | 'split' | 'harvest' | 'edit'>('details')

  if (face === 'harvest' && editing) {
    return (
      <RecordHarvestForm
        blockId={block.id}
        blockLabel={block.label}
        commodityName={block.commodityName}
        plantingDate={new Date(block.plantingDate)}
        onDone={onClose}
        onCancel={() => setFace('details')}
      />
    )
  }

  if (face === 'edit' && editing && block.varietyId && block.commodityId) {
    return (
      <EditBlockForm
        blockId={block.id}
        plotId={editing.plotId}
        blockLabel={block.label}
        areaHa={block.areaHa}
        varietyId={block.varietyId}
        commodityId={block.commodityId}
        commodities={editing.commodities}
        varieties={editing.varieties}
        plantingDate={block.plantingDate}
        onDone={onClose}
        onCancel={() => setFace('details')}
      />
    )
  }

  if (face === 'split' && editing) {
    return (
      <SplitBlockForm
        blockId={block.id}
        blockLabel={block.label}
        blockAreaHa={block.areaHa}
        commodities={editing.commodities}
        varieties={editing.varieties}
        onDone={onClose}
        onCancel={() => setFace('details')}
      />
    )
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{block.label}</p>
          <p className="text-xs text-muted-foreground">{block.commodityName}</p>
        </div>
        <Button variant="ghost" size="xs" onClick={onClose} aria-label="Tutup">✕</Button>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Luas</dt>
          <dd className="text-foreground">{block.areaHa.toFixed(2)} ha</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Ditanam</dt>
          <dd className="text-foreground">{block.plantingDateLabel}</dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-1 text-xs text-muted-foreground">Perkiraan panen</p>
        <HarvestWindow window={block.window} degraded={degraded} size="sm" />
      </div>

      {/* Directly under the window, because that is what the seasonal price is
          keyed to -- move one and the other stops meaning anything. */}
      {block.price && <PriceReference price={block.price} />}

      {editing && (
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
          {/* Recording the harvest comes first. It is the more common action --
              every block ends in one, while only some are ever split -- and it
              is the one that feeds the prediction everything else is read
              through. */}
          <div>
            <Button size="sm" onClick={() => setFace('harvest')}>
              Catat panen
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Simpan hasil sebenarnya. Perkiraan panen berikutnya ikut menyesuaikan.
            </p>
          </div>

          <div>
            <Button variant="outline" size="sm" onClick={() => setFace('split')}>
              Pecah blok
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Tanam komoditas lain di sebagian lahan ini.
            </p>
          </div>

          <div>
            <Button variant="outline" size="sm" onClick={() => setFace('edit')}>
              Ubah data blok
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Perbaiki luas, varietas, atau tanggal tanam yang salah tercatat.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * The market reference, as two numbers and the distance between them.
 *
 * Never one number. A single price on this panel would be read as what the
 * crop will fetch, and nobody knows that -- the harvest is weeks away and the
 * panel only publishes weeks that have already happened. Showing today's level
 * beside the same week a year ago says what is actually known: whether this
 * window has historically opened into a stronger or weaker patch of the year.
 *
 * The source line is not decoration. The seeded panel is synthetic, and a
 * farmer must be able to see whose number they are about to sell against.
 */
function PriceReference({ price }: { price: PriceBenchmark }) {
  const gap = seasonalGap(price)

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-1 text-xs text-muted-foreground">Harga acuan</p>

      <dl className="space-y-1 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Minggu ini</dt>
          <dd className="tabular-nums text-foreground">
            {formatRupiah(price.latest.pricePerKg)}/kg
          </dd>
        </div>

        {price.seasonal ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Minggu panen, tahun lalu</dt>
            <dd className="tabular-nums text-foreground">
              {formatRupiah(price.seasonal.pricePerKg)}/kg
              {gap !== null && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {formatSeasonalGap(gap)}
                </span>
              )}
            </dd>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Belum ada harga untuk minggu panen tahun lalu.
          </p>
        )}
      </dl>

      {price.seasonal && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Pekan {formatDateId(price.seasonal.weekStart)}. Acuan pasar, bukan
          perkiraan harga jual.
        </p>
      )}

    </div>
  )
}
