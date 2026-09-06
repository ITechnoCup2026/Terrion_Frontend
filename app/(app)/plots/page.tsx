import { CalendarClock, Layers, MapPin, Maximize2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import type { CommodityRef } from '@/components/plots/PlotCard'
import { PlotsView } from '@/components/plots/PlotsView'
import { MetricRow, type Metric } from '@/components/ui/Card'
import { Page, PageHeader } from '@/components/ui/Page'
import { addDays, toISODate } from '@/lib/agronomy/dates'
import { loadAtlasCooperatives } from '@/lib/atlas/load'
import { currentAppUser } from '@/lib/auth/session'
import { loadCommodities } from '@/lib/commodities/load'
import { formatNumberId } from '@/lib/format/number'
import { loadPlots } from '@/lib/plots/load'

export const metadata = { title: 'Lahan' }

// A plot registered a moment ago has to appear immediately.
export const dynamic = 'force-dynamic'

// Tombol pengisi cepat untuk field tanggal tanam.
//
// Dulu ada tiga: "Hari ini", "MT I <tahun>" (1 Okt), dan "MT II <tahun>"
// (1 Apr). Keduanya yang terakhir memakai tanggal tetap di tahun berjalan,
// jadi sepanjang paruh kedua tahun keduanya menawarkan tanggal yang SUDAH
// LEWAT -- 1 April sudah lima bulan berlalu ketika seseorang mendaftarkan
// lahan pada September.
//
// Blok yang ditanam sejauh itu di masa lalu sudah melewati kebutuhan GDD-nya,
// dan pencarian kematangan di backend hanya berjalan maju: begitu syaratnya
// sudah terpenuhi ia mengembalikan hari terakhir yang punya data cuaca, bukan
// hari saat syarat itu benar-benar terlampaui. Hasilnya durasi ~172 hari untuk
// varietas berumur 125 hari, dan jendela panennya ditandai `implausible`.
//
// Jadi tombolnya dihapus, bukan diperbaiki tanggalnya: mendaftarkan lahan
// adalah mencatat apa yang ADA di lahan, dan tanggal tanam yang sebenarnya
// diketik sendiri oleh kader. Menawarkan tanggal musim yang sudah lewat sebagai
// isian sekali klik adalah mengundang catatan yang salah.
function seasonShortcuts(now: Date) {
  return [{ label: 'Hari ini', date: toISODate(now) }]
}

export default async function PlotsPage() {
  const now = new Date()
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (!user.cooperative_id) redirect('/catalog')

  // GET /api/plots already returns each plot sorted by soonest harvest, with
  // its window and expected tonnage pre-computed.
  const [summaries, commodityCatalogue, cooperatives] = await Promise.all([
    loadPlots(),
    loadCommodities(),
    loadAtlasCooperatives(),
  ])

  const commodities: CommodityRef[] = commodityCatalogue.map(c => ({
    id: c.id, name: c.name, spriteRow: c.spriteRow,
  }))

  const formCommodities = commodityCatalogue.map(c => ({ id: c.id, name: c.name }))
  const formVarieties = commodityCatalogue.flatMap(c =>
    c.varieties.map(v => ({ id: v.id, commodity_id: v.commodityId, name: v.name })))
  const cooperative = cooperatives.find(c => c.id === user.cooperative_id)

  const formData = {
    commodities: formCommodities,
    varieties: formVarieties,
    origin: { lat: cooperative?.lat ?? -6.2833, lng: cooperative?.lng ?? 107.8167 },
    seasonShortcuts: seasonShortcuts(now),
  }

  // The four figures describe the cooperative, not the current filter: they
  // are the fixed thing a narrowed list is measured against.
  const soon = addDays(now, 30)
  const dueSoon = summaries.filter(s => s.nextWindow && s.nextWindow.start <= soon).length
  const kpis: Metric[] = [
    {
      label: 'Lahan',
      value: formatNumberId(summaries.length),
      icon: MapPin,
      tone: 'default',
    },
    {
      label: 'Luas total',
      value: `${formatNumberId(summaries.reduce((s, p) => s + p.areaHa, 0))} ha`,
      icon: Maximize2,
      tone: 'positive',
    },
    {
      label: 'Blok aktif',
      value: formatNumberId(summaries.reduce((s, p) => s + p.blockCount, 0)),
      icon: Layers,
      tone: 'info',
    },
    {
      label: 'Panen 30 hari',
      value: formatNumberId(dueSoon),
      hint: 'Lahan yang jatuh tempo',
      icon: CalendarClock,
      tone: dueSoon > 0 ? 'positive' : 'default',
    },
  ]

  return (
    <Page width="wide" className="flex flex-col gap-6">
      <PageHeader
        title="Lahan"
        description="Setiap lahan koperasi ini, dengan perkiraan panen terdekatnya."
      />

      {summaries.length > 0 && <MetricRow items={kpis} />}

      {/* useSearchParams needs a boundary; without one the whole route opts out
          of static rendering with a build-time error. */}
      <Suspense fallback={null}>
        <PlotsView plots={summaries} commodities={commodities} formData={formData} />
      </Suspense>
    </Page>
  )
}
