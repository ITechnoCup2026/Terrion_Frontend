'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { utcDate } from '@/lib/agronomy/dates'
import { formatNumberId } from '@/lib/format/number'
import { formatDateId } from '@/lib/harvest/format'
import { matchesSearch } from '@/lib/planning/filter'
import {
  planShareMessage, planShareUrl, shareTally, sortShares, whatsappNumber, whatsappShareUrl,
} from '@/lib/planning/share'
import type { MemberShareResponse, PlanStatus } from '@/lib/planning/types'
import { cn } from '@/lib/utils'

/**
 * The list a kader works down with a phone in their hand.
 *
 * A member has no login in this product and never will, so the only way the
 * plan made for their land reaches them is somebody sending it. This is that
 * somebody's screen: one row per member, the message already written, and a
 * record of which links have been opened so the second pass is over the nine
 * people who have not seen it rather than all forty-seven.
 *
 * Three decisions here are the whole point of the component:
 *
 * **"Tautan dibuka", never "sudah menerima".** `viewed` records that the link
 * was opened by whoever was holding it. That could be the farmer, the kader
 * testing it, a son the message was forwarded to, or WhatsApp fetching a
 * preview card. Every one of those is indistinguishable from the others, so
 * the label says exactly what was observed and stops there. The alternative —
 * "terkonfirmasi" — would turn an access log into a claim about a person, and
 * a cooperative could plan a harvest around it.
 *
 * **A missing number is not an error.** The phone field on a plot is optional
 * and always was, so half these rows can have none. Without one the button
 * still works and opens WhatsApp's contact picker with the message written;
 * the kader knows who Pak Endang is. Disabling the button instead would punish
 * the kader for a field nobody was required to fill in.
 *
 * **No preview link.** There is deliberately no "buka halamannya" button, and
 * that is not an omission: every open marks the token viewed, so a pengurus
 * checking their own work would quietly turn "belum dibuka" into "dibuka" for
 * a farmer who has still seen nothing. Copying the link does not.
 */
export function MemberShareList({
  shares,
  seasonLabel,
  cooperativeName,
  status,
}: {
  shares: MemberShareResponse[]
  seasonLabel: string
  /** Named in the message so a link arriving cold says who sent it. */
  cooperativeName: string | null
  status: PlanStatus
}) {
  const [query, setQuery] = useState('')
  const [unopenedOnly, setUnopenedOnly] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const tally = useMemo(() => shareTally(shares), [shares])

  const rows = useMemo(() => sortShares(shares).filter(s => {
    if (unopenedOnly && s.viewed) return false
    return matchesSearch([s.member_name, s.member_phone ?? ''], query)
  }), [shares, query, unopenedOnly])

  if (shares.length === 0) return null

  // Built at the moment of use rather than on render: the origin has to come
  // from the browser, and reading it during a server render would either
  // hydrate wrong or force an env var that a staging deploy would get wrong in
  // a way nobody notices until farmers land on the wrong host.
  const linkFor = (share: MemberShareResponse) =>
    planShareUrl(window.location.origin, share.share_token)

  const messageFor = (share: MemberShareResponse) => planShareMessage({
    memberName: share.member_name,
    cooperativeName,
    seasonLabel,
    url: linkFor(share),
  })

  const send = (share: MemberShareResponse) => {
    window.open(
      whatsappShareUrl(share.member_phone, messageFor(share)),
      '_blank',
      'noopener',
    )
  }

  const copy = async (share: MemberShareResponse) => {
    try {
      await navigator.clipboard.writeText(linkFor(share))
      setCopied(share.member_id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // A denied clipboard permission is not worth an error state; the
      // WhatsApp button beside it still works.
      setCopied(null)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">Tautan rencana untuk anggota</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Setiap anggota punya satu tautan sendiri yang bisa dibuka tanpa akun, berisi rencana
          untuk lahannya saja. Anggota dengan beberapa lahan tetap memakai satu tautan.
        </p>
      </div>

      {status === 'cancelled' && (
        <p className="rounded-lg border border-[var(--terrion-gold-500)]/40 bg-[var(--terrion-gold-50)] px-3.5 py-2.5 text-xs leading-relaxed text-foreground">
          Rencana ini sudah dibatalkan. Tautan lama tetap bisa dibuka dan sekarang menampilkan
          keterangan bahwa rencananya dibatalkan — tidak perlu ditarik satu per satu, tetapi
          jangan dibagikan lagi.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search aria-hidden className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari nama anggota atau nomor…"
              aria-label="Cari nama anggota atau nomor"
              className="interactive h-9 w-full rounded-lg border border-input/80 bg-card pr-3 pl-9 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:ring-1 focus:ring-ring/40 focus:outline-none sm:text-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => setUnopenedOnly(v => !v)}
            aria-pressed={unopenedOnly}
            className={cn(
              'interactive rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors',
              unopenedOnly
                ? 'border-[var(--terrion-green-500)] bg-[var(--terrion-green-500)]/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-input hover:bg-muted hover:text-foreground',
            )}
          >
            Belum dibuka
          </button>
        </div>

        <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
          {formatNumberId(tally.opened, 0)} dari {formatNumberId(tally.total, 0)} tautan pernah
          dibuka · {formatNumberId(tally.total - tally.withPhone, 0)} anggota belum punya nomor
          tersimpan.{' '}
          <span className="text-muted-foreground/90">
            &ldquo;Dibuka&rdquo; berarti tautannya pernah diakses oleh siapa pun yang memegangnya,
            bukan tanda petani sudah membaca atau menyetujui rencananya.
          </span>
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
          {unopenedOnly && query === ''
            ? 'Semua tautan sudah pernah dibuka.'
            : 'Tidak ada anggota yang cocok dengan pencarian ini.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(share => {
            const number = whatsappNumber(share.member_phone)
            return (
              <li
                key={share.member_id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-lg border border-border bg-card px-3.5 py-3 shadow-[var(--shadow-xs)]"
              >
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-xs font-medium text-foreground">{share.member_name}</p>
                  <p className="text-[0.6875rem] tabular-nums text-muted-foreground">
                    {share.member_phone
                      ? share.member_phone
                      : 'Nomor belum tercatat — pilih kontak sendiri di WhatsApp'}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
                  {share.viewed
                    ? <Badge tone="positive">Tautan dibuka</Badge>
                    : <Badge tone="neutral">Belum dibuka</Badge>}
                  {share.first_viewed_at && (
                    <span className="text-[0.6875rem] text-muted-foreground">
                      {formatDateId(utcDate(share.first_viewed_at))}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {/* One label for a number we hold and another for one we do
                      not, because the two open different things: a chat, or
                      WhatsApp's contact list. A button that says "kirim" and
                      then asks who to send it to has misled the kader. */}
                  <Button type="button" size="sm" variant="outline" onClick={() => send(share)}>
                    {number ? 'Kirim WhatsApp' : 'Pilih kontak'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copy(share)}
                    aria-label={`Salin tautan rencana ${share.member_name}`}
                  >
                    {copied === share.member_id ? 'Tersalin' : 'Salin tautan'}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
