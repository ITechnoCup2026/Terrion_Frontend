'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { saveCapacity } from '@/app/actions/capacity'
import { Button } from '@/components/ui/button'
import type { CapacityRow } from '@/lib/capacity/load'

/**
 * The one screen that lets a cooperative say how much it can actually take.
 *
 * Every figure here is a threshold the collision detector judges a week
 * against, which is why the empty state is a first-class value rather than a
 * zero: a blank field means "we have not measured this", and the detector falls
 * back to median x 2,5 exactly as it did before anyone typed anything. A zero
 * would mean "we can take nothing", and would flag every week of the season.
 *
 * A Client Component so a refusal lands beside the button rather than throwing
 * the whole page into the error boundary — the same reasoning as
 * OrderStatusActions.
 */
export function CapacityForm({
  rows,
  canEdit,
}: {
  rows: CapacityRow[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      rows.map(row => [row.commodityId, row.tonnesPerWeek === null ? '' : String(row.tonnesPerWeek)]),
    ),
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = rows.some(row => {
    const current = values[row.commodityId] ?? ''
    const original = row.tonnesPerWeek === null ? '' : String(row.tonnesPerWeek)
    return current !== original
  })

  const submit = async () => {
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      const result = await saveCapacity({
        rows: rows.map(row => ({
          commodityId: row.commodityId,
          tonnesPerWeek: (values[row.commodityId] ?? '').trim(),
        })),
      })
      if (!result.ok) { setError(result.message); return }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="panel divide-y divide-border overflow-hidden">
        {rows.map(row => (
          <div
            key={row.commodityId}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{row.commodityName}</p>
              <p className="text-xs text-muted-foreground">
                {values[row.commodityId]
                  ? 'Minggu di atas angka ini ditandai menumpuk.'
                  : 'Belum diukur — ambang memakai median panen koperasi.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                aria-label={`Kapasitas ${row.commodityName}, ton per minggu`}
                placeholder="—"
                disabled={!canEdit}
                value={values[row.commodityId] ?? ''}
                onChange={e =>
                  setValues(current => ({ ...current, [row.commodityId]: e.target.value }))
                }
                className="interactive h-9 w-28 rounded-lg border border-input/80 bg-card px-3 text-right text-sm tabular-nums text-foreground focus:border-ring focus:ring-1 focus:ring-ring/40 focus:outline-none disabled:opacity-60"
              />
              <span className="w-20 text-xs text-muted-foreground">ton/minggu</span>
            </div>
          </div>
        ))}
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="lg" onClick={submit} disabled={pending || !dirty}>
            {pending ? 'Menyimpan…' : 'Simpan kapasitas'}
          </Button>
          {saved && !dirty && (
            <p className="text-xs text-[var(--terrion-green-700)]">
              Tersimpan. Dasbor sudah memakai ambang baru ini.
            </p>
          )}
          <p className="max-w-prose text-[0.6875rem] leading-relaxed text-muted-foreground">
            Kosongkan sebuah kolom untuk menghapus angkanya. Komoditas tanpa angka kembali memakai
            ambang median, bukan nol.
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
          Hanya <strong className="font-semibold">pengurus</strong> yang dapat mengubah kapasitas.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
