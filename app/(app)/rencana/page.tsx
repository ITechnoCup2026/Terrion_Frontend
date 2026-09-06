import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarRange, CheckCircle2, ClipboardList, XCircle } from 'lucide-react'

import { PlansTable } from '@/components/planning/PlansTable'
import { buttonVariants } from '@/components/ui/button'
import { MetricRow, type Metric } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page, PageHeader } from '@/components/ui/Page'
import { currentAppUser, currentSessionId } from '@/lib/auth/session'
import { formatNumberId } from '@/lib/format/number'
import { loadPlans } from '@/lib/planning/load'

export const metadata = { title: 'Rencana tanam' }

export const dynamic = 'force-dynamic'

/**
 * Every season plan the cooperative has saved.
 *
 * Readable by anyone attached to the cooperative — a kader is entitled to know
 * what next season is supposed to look like on the land they record — but only
 * a pengurus is offered the button that makes one. The action re-checks the
 * role; hiding the button just stops the rail pointing at a refusal.
 */
export default async function PlansPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')

  const plans = await loadPlans(await currentSessionId())
  const canPlan = user.role === 'pengurus'

  const applied = plans.filter(p => p.status === 'applied')
  const cancelled = plans.filter(p => p.status === 'cancelled')
  const seasons = new Set(applied.map(p => p.season_label))

  const kpis: Metric[] = [
    {
      label: 'Rencana tersimpan',
      value: formatNumberId(plans.length, 0),
      icon: ClipboardList,
      tone: 'info',
    },
    {
      label: 'Sedang berjalan',
      value: formatNumberId(applied.length, 0),
      icon: CheckCircle2,
      tone: 'positive',
      hint: applied.length > 0 ? 'Bloknya sudah masuk ke dasbor dan RDKK' : 'Belum ada yang diterapkan',
    },
    {
      label: 'Musim tercakup',
      value: formatNumberId(seasons.size, 0),
      icon: CalendarRange,
      hint: 'Musim tanam yang sudah punya rencana',
    },
    {
      label: 'Dibatalkan',
      value: formatNumberId(cancelled.length, 0),
      icon: XCircle,
      tone: cancelled.length > 0 ? 'negative' : 'default',
      hint: 'Tetap dicatat, agar bisa dijelaskan kemudian',
    },
  ]

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        title="Rencana tanam"
        description="Susunan tanam koperasi untuk musim yang belum dimulai: siapa menanam apa, varietas mana, tanggal berapa."
        actions={
          canPlan ? (
            <Link href="/rencana/susun" className={buttonVariants({ size: 'lg' })}>
              Susun rencana musim depan
            </Link>
          ) : undefined
        }
      />

      {plans.length === 0 ? (
        <EmptyState
          title="Belum ada rencana tanam"
          description={
            canPlan
              ? 'Perencana menyusun tiga usulan untuk satu musim, lengkap dengan penugasan per anggota. Rencana yang diterapkan mengisi proyeksi dasbor, RDKK, dan katalog musim depan.'
              : 'Pengurus koperasi belum menyusun rencana tanam untuk musim depan.'
          }
          action={
            canPlan ? (
              <Link href="/rencana/susun" className={buttonVariants()}>
                Susun rencana pertama
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <MetricRow items={kpis} />
          <PlansTable plans={plans} />
        </>
      )}
    </Page>
  )
}
