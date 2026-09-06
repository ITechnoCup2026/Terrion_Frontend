'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import type { z } from 'zod'

import { createPlot } from '@/app/actions/plot'
import { Button } from '@/components/ui/button'
import {
  createPlotSchema, plotAreaHa, MAX_PLANTINGS, type CreatePlotInput,
} from '@/lib/schemas/plot'

type Commodity = { id: string; name: string }
type Variety = { id: string; commodity_id: string; name: string }

/** Copied onto a new plot by "Salin dari lahan sebelumnya". */
export type PreviousEntry = {
  commodityId: string
  varietyId: string
  plantingDate: string
} | null

type Props = {
  commodities: Commodity[]
  varieties: Variety[]
  previous: PreviousEntry
  registered: number
  /** Cooperative's own coordinates, so the first pin starts nearby. */
  origin: { lat: number; lng: number }
  seasonShortcuts: { label: string; date: string }[]
  onSuccess?: (plotId: string, plotName: string) => void
  onCancel?: () => void
}

type FormValues = z.input<typeof createPlotSchema>

const field = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm ' +
  'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const label = 'block text-sm font-medium text-foreground mb-1.5'
const errorText = 'mt-1 text-xs text-destructive'

const emptyPlanting = { commodityId: '', varietyId: '', plantingDate: '', areaHa: '' }

/** Hectares as Indonesian decimals, for the running total. */
const ha = (n: number) => n.toFixed(2).replace('.', ',')

export function PlotForm({
  commodities, varieties, previous, registered, origin, seasonShortcuts, onSuccess, onCancel,
}: Props) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    control, register, handleSubmit, watch, setValue, getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, CreatePlotInput>({
    resolver: zodResolver(createPlotSchema),
    defaultValues: {
      memberName: '', memberPhone: '', plotName: '',
      lat: origin.lat, lng: origin.lng,
      plantings: [{ ...emptyPlanting }],
    } as unknown as FormValues,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'plantings' })
  const plantings = watch('plantings') ?? []
  const single = fields.length === 1

  // The plot's area is the sum of what is planted on it, so this is the only
  // place the total exists -- there is no second field for it to disagree with.
  const total = plotAreaHa(plantings.map(p => ({ areaHa: Number(p?.areaHa) || 0 })))

  // Copies the first crop of the last plot registered. Kaders enter a village
  // one field at a time, and it is the same crop on the same date all morning.
  const copyPrevious = () => {
    if (!previous) return
    setValue('plantings.0.commodityId', previous.commodityId, { shouldValidate: true })
    setValue('plantings.0.varietyId', previous.varietyId, { shouldValidate: true })
    setValue('plantings.0.plantingDate', previous.plantingDate, { shouldValidate: true })
  }

  // Adding a crop splits the area already entered rather than starting from
  // zero: the kader knows the plot is 0,72 ha, not that carrots take 0,3 of it.
  // The total they typed stays the total; they adjust the halves.
  const addPlanting = () => {
    const last = getValues(`plantings.${fields.length - 1}` as const)
    const lastArea = Number(last?.areaHa) || 0
    const half = Math.round(lastArea * 50) / 100      // half, to two decimals
    if (half > 0) {
      setValue(`plantings.${fields.length - 1}.areaHa`, String(
        Math.round((lastArea - half) * 100) / 100))
    }
    append({
      ...emptyPlanting,
      // Same season unless told otherwise; the date is rarely what differs.
      plantingDate: last?.plantingDate ?? '',
      areaHa: half > 0 ? String(half) : '',
    } as never)
  }

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      p => {
        setValue('lat', Number(p.coords.latitude.toFixed(6)), { shouldValidate: true })
        setValue('lng', Number(p.coords.longitude.toFixed(6)), { shouldValidate: true })
      },
      () => setSubmitError('Tidak bisa membaca lokasi. Isi koordinat secara manual.'),
    )
  }

  const onSubmit = handleSubmit(async values => {
    setSubmitError(null)
    try {
      const result = await createPlot(values)
      if (!result.ok) { setSubmitError(result.message); return }
      if (onSuccess) {
        onSuccess(result.data.plotId, values.plotName)
      } else {
        router.push(`/plots/${result.data.plotId}`)
      }
    } catch {
      setSubmitError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Lahan {registered + 1} terdaftar</p>
        {previous && (
          <Button type="button" variant="outline" size="sm" onClick={copyPrevious}>
            Salin dari lahan sebelumnya
          </Button>
        )}
      </div>

      <div>
        <label className={label} htmlFor="memberName">Nama petani</label>
        <input id="memberName" className={field} autoComplete="off" {...register('memberName')} />
        {errors.memberName && <p className={errorText}>{errors.memberName.message}</p>}
      </div>

      {/* Optional, and drawn as optional. A kader standing at the edge of a
          field often does not have the number, and a required field here would
          be answered with a zero or a colleague's phone rather than left
          empty. What it buys is said plainly, because a number asked for
          without a reason is a number nobody gives. */}
      <div>
        <label className={label} htmlFor="memberPhone">
          Nomor WhatsApp petani
          <span className="ml-1.5 font-normal text-muted-foreground">opsional</span>
        </label>
        <input id="memberPhone" className={field} type="tel" inputMode="tel"
          autoComplete="off" placeholder="08…" {...register('memberPhone')} />
        <p className="mt-1 text-xs text-muted-foreground">
          Dipakai untuk mengirimkan tautan rencana tanam lewat WhatsApp. Nomor yang sudah
          tercatat untuk petani ini tidak akan tertimpa.
        </p>
        {errors.memberPhone && <p className={errorText}>{errors.memberPhone.message}</p>}
      </div>

      <div>
        <label className={label} htmlFor="plotName">Nama lahan</label>
        <input id="plotName" className={field} {...register('plotName')} />
        {errors.plotName && <p className={errorText}>{errors.plotName.message}</p>}
      </div>

      {/* One card per crop. With a single crop the card has no frame and its
          area field is simply "Luas lahan" — the form a kader registering one
          field of rice sees is the form they saw before. The frame, the
          numbering and the total appear only once there is something to tell
          apart. */}
      <div className={single ? 'space-y-5' : 'space-y-3'}>
        {fields.map((row, i) => {
          const commodityId = plantings[i]?.commodityId ?? ''
          const shown = varieties.filter(v => v.commodity_id === commodityId)
          const rowErrors = errors.plantings?.[i]

          return (
            <div
              key={row.id}
              className={single ? 'space-y-5' : 'space-y-4 rounded-xl border border-border bg-card p-4'}
            >
              {!single && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">Tanaman {i + 1}</p>
                  <Button type="button" variant="ghost" size="xs" onClick={() => remove(i)}>
                    Hapus
                  </Button>
                </div>
              )}

              <div>
                <label className={label} htmlFor={`areaHa-${i}`}>
                  {single ? 'Luas lahan (ha)' : 'Luas (ha)'}
                </label>
                <input id={`areaHa-${i}`} className={field} type="number" step="0.01"
                  inputMode="decimal" {...register(`plantings.${i}.areaHa`)} />
                {rowErrors?.areaHa && <p className={errorText}>{rowErrors.areaHa.message}</p>}
              </div>

              <div>
                <label className={label} htmlFor={`commodityId-${i}`}>Komoditas</label>
                <select id={`commodityId-${i}`} className={field}
                  {...register(`plantings.${i}.commodityId`)}
                  onChange={e => {
                    setValue(`plantings.${i}.commodityId`, e.target.value, { shouldValidate: true })
                    // A stale variety would belong to the old crop.
                    setValue(`plantings.${i}.varietyId`, '', { shouldValidate: false })
                  }}>
                  <option value="">Pilih komoditas</option>
                  {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {rowErrors?.commodityId && (
                  <p className={errorText}>{rowErrors.commodityId.message}</p>
                )}
              </div>

              <div>
                <label className={label} htmlFor={`varietyId-${i}`}>Varietas</label>
                <select id={`varietyId-${i}`} className={field} disabled={!commodityId}
                  {...register(`plantings.${i}.varietyId`)}>
                  <option value="">{commodityId ? 'Pilih varietas' : 'Pilih komoditas dulu'}</option>
                  {shown.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                {rowErrors?.varietyId && <p className={errorText}>{rowErrors.varietyId.message}</p>}
              </div>

              <div>
                <label className={label} htmlFor={`plantingDate-${i}`}>Tanggal tanam</label>
                <input id={`plantingDate-${i}`} className={field} type="date"
                  {...register(`plantings.${i}.plantingDate`)} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {seasonShortcuts.map(s => (
                    <Button key={s.date} type="button" variant="secondary" size="xs"
                      onClick={() => setValue(`plantings.${i}.plantingDate`, s.date,
                        { shouldValidate: true })}>
                      {s.label}
                    </Button>
                  ))}
                </div>
                {rowErrors?.plantingDate && (
                  <p className={errorText}>{rowErrors.plantingDate.message}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={addPlanting}
          disabled={fields.length >= MAX_PLANTINGS}>
          Tambah komoditas
        </Button>
        {!single && (
          <p className="text-sm text-muted-foreground">
            Total luas lahan <span className="font-medium text-foreground">{ha(total)} ha</span>
          </p>
        )}
      </div>
      {errors.plantings?.root && <p className={errorText}>{errors.plantings.root.message}</p>}
      {errors.plantings?.message && <p className={errorText}>{errors.plantings.message}</p>}

      <div>
        <span className={label}>Lokasi</span>
        <div className="flex flex-wrap items-start gap-2">
          <input aria-label="Lintang" className={`${field} max-w-40`} type="number" step="0.000001"
            {...register('lat')} />
          <input aria-label="Bujur" className={`${field} max-w-40`} type="number" step="0.000001"
            {...register('lng')} />
          <Button type="button" variant="outline" onClick={useMyLocation}>Gunakan lokasi saya</Button>
        </div>
        {(errors.lat || errors.lng) && (
          <p className={errorText}>Koordinat harus berada di dalam wilayah Indonesia.</p>
        )}
      </div>

      {submitError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan…' : 'Simpan lahan'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel} disabled={isSubmitting}>
            Batal
          </Button>
        )}
      </div>
    </form>
  )
}
