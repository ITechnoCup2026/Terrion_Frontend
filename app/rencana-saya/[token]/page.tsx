import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PlausibilityBadge } from '@/components/planning/PlausibilityBadge'
import { Logo } from '@/components/ui/Logo'
import { utcDate } from '@/lib/agronomy/dates'
import { formatNumberId } from '@/lib/format/number'
import { formatDateId, formatHarvestRange } from '@/lib/harvest/format'
import { loadMemberPlanShare } from '@/lib/planning/public-load'
import type { MemberPlanShareItemResponse } from '@/lib/planning/types'
import { inputItemLabel } from '@/lib/rdkk/label'
import { KG_PER_SACK } from '@/lib/rdkk/order'

/**
 * The farmer's own page: what was planned for their land, opened from a
 * WhatsApp message, with no account and no password.
 *
 * A member has never had a login here, and adding one was considered and
 * rejected — the product already answers "show a person one thing without an
 * account" with a public link (`/garden/:public_id`), and this is the same
 * answer to the same question. It sits outside the (app) group for that
 * reason, and outside (public) because that group's header offers a stranger
 * ways into a product this reader is not a customer of.
 *
 * Three rules hold this page together:
 *
 * **It says nothing about anybody else.** The payload carries this member's
 * plots and this member's fertiliser, and no internal ids at all, so there is
 * nothing on the page to guess another resource from.
 *
 * **A cancelled plan says so at the top.** `plan_status` is read live rather
 * than frozen into the link, so a plan withdrawn after the message was sent
 * announces itself the next time the page is opened. The plantings stay
 * visible below it as history — deleting them would leave a farmer who
 * remembers a date with no way to check what changed — which is exactly why
 * the banner has to be unmissable.
 *
 * **Every figure is hedged where it is printed.** The tonnages are a model's
 * estimate, and this page is the furthest one from the screen that explains
 * that, so the hedge travels with the numbers instead of living in a footnote
 * somebody scrolls past.
 */

/**
 * Static, and deliberately not generated from the plan.
 *
 * `generateMetadata` and the page body are two separate renders, and the read
 * behind this page marks the token as opened every time it runs — so fetching
 * here would record one visit as two, and inflate the only number a pengurus
 * has. It would also hand WhatsApp's preview crawler the farmer's name to show
 * in a group chat, which is a leak of exactly the sort this page avoids
 * everywhere else.
 */
export const metadata = {
  title: 'Rencana tanam Anda',
  description: 'Rencana tanam untuk lahan Anda, dibagikan oleh koperasi.',
  // A private link. Indexing it would put a farmer's plan in a search result.
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function MemberPlanSharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const share = await loadMemberPlanShare(token)
  // A wrong token, an expired one and one that never existed are one answer by
  // contract. Nothing on this page may help a stranger tell them apart.
  if (!share) notFound()

  const cancelled = share.plan_status === 'cancelled'
  const totalHa = share.items.reduce((sum, i) => sum + i.area_ha, 0)

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Terrion — beranda">
            <Logo size={22} />
          </Link>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
            Halaman publik
          </span>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{share.cooperative_name}</p>
          <h1 className="mt-1 text-xl font-semibold text-foreground">
            Rencana tanam {share.season_label}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Untuk lahan {share.member_name}
            {share.items.length > 0 && (
              <> · {formatNumberId(share.items.length, 0)} lahan · {formatNumberId(totalHa, 2)} ha</>
            )}
          </p>
        </div>
      </header>

      {/* Not a badge and not a tint: the reader may act on the dates below, and
          a cancelled plan they act on costs them a season. It is a paragraph,
          at the top, before anything it contradicts. */}
      {cancelled && (
        <section className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-destructive">Rencana ini sudah dibatalkan</h2>
          <p className="mt-1 text-xs leading-relaxed text-foreground">
            Koperasi membatalkan rencana ini setelah tautannya dikirimkan. Rinciannya masih
            ditampilkan di bawah sebagai catatan, tetapi <strong>jangan dijadikan pegangan untuk
            menanam</strong>. Hubungi kader atau pengurus koperasi untuk rencana yang berlaku.
          </p>
        </section>
      )}

      {share.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada lahan yang tercatat pada rencana ini.
        </p>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Yang direncanakan di lahan Anda</h2>
          <ul className="flex flex-col gap-3">
            {share.items.map((item, i) => (
              <PlantingCard key={`${item.plot_name}-${item.planting_date}-${i}`} item={item} />
            ))}
          </ul>
        </section>
      )}

      {share.fertiliser.length > 0 && (
        <section className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/30 p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Perkiraan kebutuhan pupuk
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              untuk lahan Anda saja
            </span>
          </h2>
          <ul className="flex flex-col gap-1.5">
            {share.fertiliser.map(line => (
              <li key={line.input_item} className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-foreground">
                  {inputItemLabel(line.input_item)}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {formatNumberId(line.quantity_kg, 0)} kg
                  <span className="font-normal text-muted-foreground">
                    {' '}· {formatNumberId(Math.ceil(line.quantity_kg / KG_PER_SACK), 0)} sak
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
            Angka ini dasar pengajuan RDKK koperasi, bukan jumlah yang sudah pasti diterima.
          </p>
        </section>
      )}

      {/* The cap flags, it never truncates — the same stance the RDKK screen
          and the planner take, said here in the second person because this is
          the person it happens to. */}
      {share.over_subsidy_cap && (
        <section className="rounded-lg border border-[var(--terrion-gold-500)]/40 bg-[var(--terrion-gold-50)] px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Luas di atas batas subsidi</h2>
          <p className="mt-1 text-xs leading-relaxed text-foreground">
            Total luas garapan Anda pada rencana ini{' '}
            {formatNumberId(share.over_subsidy_cap.planted_ha, 2)} ha, yaitu{' '}
            {formatNumberId(share.over_subsidy_cap.excess_ha, 2)} ha di atas batas pupuk
            bersubsidi. Lahannya tetap bisa ditanam — hanya pupuk untuk kelebihan luas itu yang
            dibeli tanpa subsidi.
          </p>
        </section>
      )}

      <footer className="flex flex-col gap-2 border-t border-border pt-4 text-[0.6875rem] leading-relaxed text-muted-foreground">
        <p>
          Perkiraan hasil dan jadwal panen di halaman ini dihitung dari data cuaca dan catatan
          panen sebelumnya. Angkanya perkiraan, bukan janji — cuaca, hama dan harga bisa
          mengubahnya.
        </p>
        <p>
          Halaman ini dibagikan oleh {share.cooperative_name}. Kalau ada yang tidak sesuai dengan
          lahan Anda, hubungi kader koperasi yang mencatatnya.
        </p>
      </footer>
    </main>
  )
}

/**
 * One plot's instruction, in the order it is acted on: what to plant, when to
 * plant it, when it comes in, and how much that might be.
 *
 * Stacked at 360 px because that is the phone this arrives on.
 */
function PlantingCard({ item }: { item: MemberPlanShareItemResponse }) {
  return (
    <li className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-xs)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-foreground">{item.plot_name}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatNumberId(item.area_ha, 2)} ha
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Row label="Tanaman" value={`${item.commodity_name} · ${item.variety_name}`} />
        <Row label="Tanggal tanam" value={formatDateId(utcDate(item.planting_date))} />
        <Row
          label="Perkiraan panen"
          value={formatHarvestRange(utcDate(item.harvest_start), utcDate(item.harvest_end))}
        />
        <Row
          label="Perkiraan hasil"
          value={`${formatNumberId(item.tonnes_low)}–${formatNumberId(item.tonnes_high)} t`}
          hint={`perkiraan tengah ${formatNumberId(item.tonnes_mid)} t`}
        />
      </dl>

      {/* The same badge the cooperative's own screens carry, so a farmer who
          asks their kader about it hears the same word back. */}
      <div>
        <PlausibilityBadge value={item.plausibility} />
      </div>
    </li>
  )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xs font-medium text-foreground">{value}</dd>
      {hint && <p className="text-[0.6875rem] tabular-nums text-muted-foreground">{hint}</p>}
    </div>
  )
}
