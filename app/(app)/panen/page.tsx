import { redirect } from 'next/navigation'
import { CalendarCheck, Scale, Sprout, Wallet } from 'lucide-react'

import { HarvestHistoryTable } from '@/components/harvest/HarvestHistoryTable'
import { MetricRow, type Metric } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page, PageHeader } from '@/components/ui/Page'
import { currentAppUser } from '@/lib/auth/session'
import { formatNumberId } from '@/lib/format/number'
import { loadHarvestHistory, yieldPerHa } from '@/lib/harvest/history'

export const metadata = { title: 'Riwayat panen' }

// A harvest recorded a minute ago has to appear here.
export const dynamic = 'force-dynamic'

/**
 * Every harvest this cooperative has recorded.
 *
 * Recording a harvest closes the block: it leaves the farm canvas because
 * nothing is growing there any more. That was previously the end of it — the
 * kader who typed 7.400 kg had no way to see it again, and the calibration
 * those figures move could not be checked by anyone. A model that learns from
 * records nobody can inspect is a model nobody can argue with.
 */
export default async function HarvestHistoryPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (!user.cooperative_id) redirect('/catalog')

  const records = await loadHarvestHistory()

  const totalTonnes = records.reduce((sum, r) => sum + r.actualYieldKg / 1000, 0)
  const paid = records.filter(r => r.paymentDate !== null)
  const perHa = records.map(yieldPerHa).filter((v): v is number => v !== null)
  const averagePerHa = perHa.length > 0
    ? perHa.reduce((sum, v) => sum + v, 0) / perHa.length
    : null

  const kpis: Metric[] = [
    {
      label: 'Panen tercatat',
      value: formatNumberId(records.length, 0),
      icon: CalendarCheck,
      tone: 'info',
    },
    {
      label: 'Total tonase',
      value: `${formatNumberId(totalTonnes, 2)} t`,
      icon: Scale,
      hint: 'Dijumlahkan dari yang benar-benar ditimbang',
    },
    {
      label: 'Rata-rata hasil',
      // Null rather than 0: no recorded harvest is not the same as no yield.
      value: averagePerHa === null ? '—' : `${formatNumberId(averagePerHa, 2)} t/ha`,
      icon: Sprout,
      hint: averagePerHa === null ? 'Belum ada yang bisa dirata-ratakan' : undefined,
    },
    {
      label: 'Sudah dibayar',
      value: `${formatNumberId(paid.length, 0)} / ${formatNumberId(records.length, 0)}`,
      icon: Wallet,
      tone: paid.length === records.length && records.length > 0 ? 'positive' : 'default',
      hint: 'Panen yang tanggal pembayarannya tercatat',
    },
  ]

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        title="Riwayat panen"
        description={
          'Setiap panen yang pernah dicatat koperasi ini. Angkanya bukan perkiraan — '
          + 'semuanya ditimbang di lahan, dan inilah yang mengkalibrasi proyeksi berikutnya.'
        }
      />

      {records.length === 0 ? (
        <EmptyState
          title="Belum ada panen yang tercatat"
          description={
            'Catat panen dari halaman lahan: buka satu lahan, klik petaknya, lalu '
            + '"Catat panen". Setelah tercatat, panen itu muncul di sini.'
          }
        />
      ) : (
        <>
          <MetricRow items={kpis} />
          <HarvestHistoryTable records={records} />
        </>
      )}
    </Page>
  )
}
