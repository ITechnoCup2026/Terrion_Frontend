'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { updateBlock } from '@/app/actions/plot-edit'
import { Button } from '@/components/ui/button'
import type { ReferenceCommodity, ReferenceVariety } from './SplitBlockForm'

const label = 'block text-xs font-medium text-muted-foreground mb-1'
const field =
  'interactive h-9 w-full rounded-lg border border-input/80 bg-card px-3 text-sm text-foreground '
  + 'focus:border-ring focus:ring-1 focus:ring-ring/40 focus:outline-none'

/**
 * Correcting a block that is already on record.
 *
 * Land changes: a corner is sold, a boundary is re-measured, and the variety
 * that actually went in turns out not to be the one written down. Before this
 * the only remedy was registering the plot again and abandoning the old one,
 * which left the cooperative's projection counting the same hectares twice.
 *
 * Every field arrives prefilled from the block's current state, and the whole
 * state is sent back rather than a patch of what changed. That makes the
 * outcome legible: what is in the form is what will be stored.
 *
 * A harvested block never reaches here — the panel does not offer the button —
 * but the server refuses one anyway, and that refusal is drawn below.
 */
export function EditBlockForm({
  blockId,
  plotId,
  blockLabel,
  areaHa,
  varietyId,
  commodityId,
  commodities,
  varieties,
  plantingDate,
  onDone,
  onCancel,
}: {
  blockId: string
  plotId: string
  blockLabel: string
  areaHa: number
  varietyId: string
  commodityId: string
  commodities: ReferenceCommodity[]
  varieties: ReferenceVariety[]
  /** ISO date, as the canvas already carries it. */
  plantingDate: string
  onDone: () => void
  onCancel: () => void
}) {
  const router = useRouter()
  const [area, setArea] = useState(String(areaHa))
  const [commodity, setCommodity] = useState(commodityId)
  const [variety, setVariety] = useState(varietyId)
  const [planted, setPlanted] = useState(plantingDate)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shown = varieties.filter(v => v.commodity_id === commodity)

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      const result = await updateBlock({
        blockId, plotId, areaHa: area, varietyId: variety, plantingDate: planted,
      })
      if (!result.ok) { setError(result.message); return }
      router.refresh()
      onDone()
    } catch {
      setError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Ubah {blockLabel}</p>
        <p className="text-xs text-muted-foreground">
          Perbaiki apa yang tercatat. Perkiraan panen dihitung ulang setelah disimpan.
        </p>
      </div>

      <div>
        <label className={label} htmlFor="edit-areaHa">Luas (ha)</label>
        <input
          id="edit-areaHa" className={field} type="number" step="0.01" inputMode="decimal"
          value={area} onChange={e => setArea(e.target.value)}
        />
      </div>

      <div>
        <label className={label} htmlFor="edit-commodityId">Komoditas</label>
        <select
          id="edit-commodityId" className={field} value={commodity}
          onChange={e => {
            setCommodity(e.target.value)
            // The old variety belongs to the old commodity, so keeping it would
            // store a pairing the projection cannot read.
            setVariety('')
          }}
        >
          {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="edit-varietyId">Varietas</label>
        <select
          id="edit-varietyId" className={field} value={variety}
          onChange={e => setVariety(e.target.value)}
        >
          <option value="">Pilih varietas</option>
          {shown.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="edit-plantingDate">Tanggal tanam</label>
        <input
          id="edit-plantingDate" className={field} type="date"
          value={planted} onChange={e => setPlanted(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={submit} disabled={pending || !variety}>
          {pending ? 'Menyimpan…' : 'Simpan perubahan'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Batal</Button>
      </div>
    </div>
  )
}
