import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import type { CommodityRef } from '@/components/plots/PlotCard'
import { PlotsView, type PlotMetric } from '@/components/plots/PlotsView'
import { Page } from '@/components/ui/Page'
import { addDays, toISODate } from '@/lib/agronomy/dates'
import { loadAtlasCooperatives } from '@/lib/atlas/load'
import { currentAppUser } from '@/lib/auth/session'
import { loadCommodities } from '@/lib/commodities/load'
import { formatNumberId } from '@/lib/format/number'
import { loadPlots } from '@/lib/plots/load'

export const metadata = { title: 'Lahan' }

// A plot registered a moment ago has to appear immediately.
export const dynamic = 'force-dynamic'

function seasonShortcuts(now: Date) {
  const year = now.getUTCFullYear()
  return [
    { label: 'Hari ini', date: toISODate(now) },
    { label: `MT I ${year}/${String(year + 1).slice(2)}`, date: `${year}-10-01` },
    { label: `MT II ${year}`, date: `${year}-04-01` },
  ]
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

  // Data only, no component references: the view turns each `key` into its
  // glyph, because a server component cannot hand one across the boundary.
  const metrics: PlotMetric[] = [
    {
      key: 'plots',
      label: 'Lahan',
      value: formatNumberId(summaries.length),
      tone: 'default',
    },
    {
      key: 'area',
      label: 'Luas total',
      value: `${formatNumberId(summaries.reduce((s, p) => s + p.areaHa, 0))} ha`,
      tone: 'positive',
    },
    {
      key: 'blocks',
      label: 'Blok aktif',
      value: formatNumberId(summaries.reduce((s, p) => s + p.blockCount, 0)),
      tone: 'info',
    },
    {
      key: 'due',
      label: 'Panen 30 hari',
      value: formatNumberId(dueSoon),
      hint: 'Lahan yang jatuh tempo',
      tone: dueSoon > 0 ? 'positive' : 'default',
    },
  ]

  return (
    <Page width="wide">
      {/* useSearchParams needs a boundary; without one the whole route opts out
          of static rendering with a build-time error. */}
      <Suspense fallback={null}>
        <PlotsView
          plots={summaries}
          commodities={commodities}
          metrics={metrics}
          formData={formData}
        />
      </Suspense>
    </Page>
  )
}
