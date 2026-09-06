'use client'

import {
  CalendarClock, CheckCircle2, ChevronUp, Layers, MapPin, Maximize2, Plus, Sprout, X,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { PlotForm } from '@/components/plots/PlotForm'
import { PlotBrowser } from '@/components/plots/PlotBrowser'
import type { CommodityRef } from '@/components/plots/PlotCard'
import { MetricRow, type Metric } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/Page'
import { Button } from '@/components/ui/button'
import type { PlotSummary } from '@/lib/plots/summary'
import { cn } from '@/lib/utils'

type Commodity = { id: string; name: string }
type Variety = { id: string; commodity_id: string; name: string }

/**
 * The glyph for each headline figure.
 *
 * Named rather than passed in, because the page that computes the figures is a
 * server component and a React component is not serialisable across that
 * boundary -- handing `icon: MapPin` down would fail at the boundary, not in
 * the view.
 */
const METRIC_ICONS = {
  plots: MapPin,
  area: Maximize2,
  blocks: Layers,
  due: CalendarClock,
} as const

/** One headline figure, as the server page can express it: data only. */
export type PlotMetric = {
  key: keyof typeof METRIC_ICONS
  label: string
  value: string
  hint?: string
  tone?: Metric['tone']
}

type Props = {
  plots: PlotSummary[]
  commodities: CommodityRef[]
  metrics: PlotMetric[]
  formData: {
    commodities: Commodity[]
    varieties: Variety[]
    origin: { lat: number; lng: number }
    seasonShortcuts: { label: string; date: string }[]
  }
}

/**
 * The whole of /plots below the shell: title, the four figures, the
 * registration form, and the list.
 *
 * The header lives here rather than in the page so the one action the screen
 * offers sits beside the title, the way the dashboard's does. It used to be a
 * second heading -- "Lahan" from <PageHeader>, then "Daftar Lahan Koperasi"
 * with the button under it -- which named the same screen twice and put its
 * primary action on the lower rung.
 */
export function PlotsView({ plots, commodities, metrics, formData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLDivElement>(null)

  const isNewParam = searchParams.get('new') === '1' || searchParams.get('action') === 'new'
  const [formOpen, setFormOpen] = useState(isNewParam)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isNewParam) {
      setFormOpen(true)
      formRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isNewParam])

  const toggleForm = () => {
    setFormOpen(prev => {
      const next = !prev
      if (next) {
        setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 100)
      }
      return next
    })
  }

  const handleSuccess = (_plotId: string, plotName: string) => {
    setSuccessMessage(`Lahan "${plotName || 'baru'}" berhasil didaftarkan!`)
    router.refresh()
    setTimeout(() => {
      setSuccessMessage(null)
      setFormOpen(false)
    }, 1200)
  }

  const items: Metric[] = metrics.map(m => ({
    label: m.label,
    value: m.value,
    hint: m.hint,
    tone: m.tone,
    icon: METRIC_ICONS[m.key],
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lahan"
        description="Setiap lahan koperasi ini, dengan perkiraan panen terdekatnya."
        actions={
          <Button
            onClick={toggleForm}
            variant={formOpen ? 'outline' : 'default'}
            size="sm"
            aria-expanded={formOpen}
            className={cn(
              'interactive gap-2 rounded-lg font-medium',
              formOpen
                ? 'hover:bg-[var(--terrion-green-50)]'
                : 'bg-[var(--terrion-green-700)] text-white shadow-[0_2px_10px_rgba(15,77,60,0.25)] hover:bg-[var(--terrion-green-900)]',
            )}
          >
            {formOpen ? <ChevronUp className="size-4" /> : <Plus className="size-4" />}
            {formOpen ? 'Tutup form' : 'Daftarkan lahan'}
          </Button>
        }
      />

      {plots.length > 0 && <MetricRow items={items} />}

      {formOpen && (
        <div ref={formRef} className="rise panel overflow-hidden p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--terrion-green-50)] text-[var(--terrion-green-700)]">
                <Sprout aria-hidden className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  Form pendaftaran lahan
                </h2>
                <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
                  Isi data petani, komoditas, dan lokasi lahan tanpa perlu berpindah halaman.
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)} aria-label="Tutup form">
              <X className="size-4" />
            </Button>
          </div>

          {successMessage && (
            <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-[var(--terrion-green-300)] bg-[var(--terrion-green-50)] p-3.5 text-sm font-medium text-[var(--terrion-green-700)]">
              <CheckCircle2 aria-hidden className="size-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <PlotForm
            commodities={formData.commodities}
            varieties={formData.varieties}
            previous={null}
            registered={plots.length}
            origin={formData.origin}
            seasonShortcuts={formData.seasonShortcuts}
            onSuccess={handleSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </div>
      )}

      <PlotBrowser
        plots={plots}
        commodities={commodities}
        onRegisterClick={() => setFormOpen(true)}
      />
    </div>
  )
}
