import { redirect } from 'next/navigation'

import { CapacityForm } from '@/components/capacity/CapacityForm'
import { Page, PageHeader } from '@/components/ui/Page'
import { currentAppUser } from '@/lib/auth/session'
import { loadCapacity } from '@/lib/capacity/load'

export const metadata = { title: 'Kapasitas koperasi' }

// The figures here are the thresholds the dashboard reads every week against,
// so a cached copy would show a pengurus the table they replaced.
export const dynamic = 'force-dynamic'

/**
 * How much the cooperative can absorb, per commodity, per week.
 *
 * Readable by anyone attached to the cooperative — a kader is entitled to know
 * what the warehouse holds — but only a pengurus may change it. The action
 * re-checks the role; disabling the inputs only stops the screen offering a
 * refusal.
 */
export default async function CapacityPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (!user.cooperative_id) redirect('/catalog')

  const rows = await loadCapacity()
  const measured = rows.filter(row => row.tonnesPerWeek !== null).length

  return (
    <Page width="doc" className="flex flex-col gap-6">
      <PageHeader
        title="Kapasitas koperasi"
        description={
          'Berapa ton per komoditas yang sanggup diserap koperasi dalam satu minggu — gudang, '
          + 'truk, dan tenaga yang benar-benar ada. Angka inilah yang dipakai dasbor untuk '
          + 'menandai minggu yang menumpuk.'
        }
      />

      <p className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
        {measured === 0 ? (
          <>
            Belum ada satu pun komoditas yang diukur. Sampai diisi, dasbor menandai minggu memakai
            <strong className="font-semibold text-foreground"> median panen koperasi × 2,5</strong> —
            perkiraan kasar yang tidak tahu apa-apa tentang gudang Anda.
          </>
        ) : (
          <>
            {measured} dari {rows.length} komoditas sudah diukur. Yang belum tetap memakai ambang
            median × 2,5.
          </>
        )}
      </p>

      <CapacityForm rows={rows} canEdit={user.role === 'pengurus'} />
    </Page>
  )
}
