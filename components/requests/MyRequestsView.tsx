'use client'

import { useMemo, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  MapPin,
  Search,
  Store,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'

import { CropMark } from '@/components/commerce/CropMark'
import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { WhatsAppButton } from '@/components/commerce/WhatsAppButton'
import { requestMessageToCooperative } from '@/lib/supply-requests/message'
import { MetricRow, type Metric } from '@/components/ui/Card'
import {
  SegmentedControl,
  SortableTh,
  Table,
  TableFrame,
  TableToolbar,
  TBody,
  Td,
  Th,
  THead,
} from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { utcDate } from '@/lib/agronomy/dates'
import { REQUEST_STATUS_LABEL } from '@/lib/catalog/copy'
import { formatDateId } from '@/lib/harvest/format'
import { formatNumberId } from '@/lib/format/number'
import type { SupplyRequest } from '@/lib/supply-requests/load'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | SupplyRequest['status']
type SortKey = 'commodity' | 'cooperative' | 'volume' | 'window' | 'created' | 'status'

const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'accepted', 'declined', 'withdrawn']

const STATUS_TONE: Record<SupplyRequest['status'], 'positive' | 'warning' | 'negative' | 'neutral'> = {
  accepted: 'positive',
  pending: 'warning',
  declined: 'negative',
  withdrawn: 'neutral',
}

interface CommodityItem {
  id: string
  name: string
}

interface CooperativeItem {
  id: string
  name: string
  province?: string
  district?: string
}

/**
 * Parses raw notes into delivery preference string and optional custom notes.
 */
function parseNotes(notes: string | undefined | null) {
  if (!notes) return { deliveryPref: null, extraNotes: '' }
  const prefMatch = notes.match(/Preferensi pengiriman:\s*([^.\n]+)\.?/i)
  const deliveryPref = prefMatch ? prefMatch[1].trim() : null
  const extraNotes = notes.replace(/Preferensi pengiriman:\s*[^.\n]+\.?/gi, '').trim()
  return { deliveryPref, extraNotes }
}

export function MyRequestsView({
  requests,
  commodities,
  cooperatives,
}: {
  requests: SupplyRequest[]
  commodities: CommodityItem[]
  cooperatives: CooperativeItem[]
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created')
  const [sortDesc, setSortDesc] = useState(true)
  const [detailRequest, setDetailRequest] = useState<SupplyRequest | null>(null)

  const commodityMap = useMemo(
    () => new Map(commodities.map(c => [c.id, c.name])),
    [commodities],
  )

  const cooperativeMap = useMemo(
    () => new Map(cooperatives.map(c => [c.id, c])),
    [cooperatives],
  )

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const acceptedCount = requests.filter(r => r.status === 'accepted').length
  const declinedCount = requests.filter(r => r.status === 'declined').length

  const totalTonnes = requests.reduce((sum, r) => sum + r.volumeKg / 1000, 0)
  const pendingTonnes = requests
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + r.volumeKg / 1000, 0)
  const acceptedTonnes = requests
    .filter(r => r.status === 'accepted')
    .reduce((sum, r) => sum + r.volumeKg / 1000, 0)

  const kpis: Metric[] = [
    {
      label: 'Total permintaan',
      value: formatNumberId(requests.length),
      icon: Inbox,
      tone: 'info',
      hint: `${formatNumberId(totalTonnes)} ton total diajukan`,
    },
    {
      label: 'Menunggu persetujuan',
      value: formatNumberId(pendingCount),
      icon: Clock,
      tone: pendingCount > 0 ? 'accent' : 'default',
      hint: pendingCount > 0 ? `${formatNumberId(pendingTonnes)} ton dalam tinjauan` : 'Tidak ada antrean',
    },
    {
      label: 'Disetujui koperasi',
      value: formatNumberId(acceptedCount),
      icon: CheckCircle2,
      tone: 'positive',
      hint: `${formatNumberId(acceptedTonnes)} ton siap alokasi`,
    },
    {
      label: 'Ditolak',
      value: formatNumberId(declinedCount),
      icon: XCircle,
      tone: declinedCount > 0 ? 'negative' : 'default',
      hint: declinedCount > 0 ? 'Kuota panen penuh' : 'Tidak ada penolakan',
    },
  ]

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      if (!matchStatus) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const comm = (commodityMap.get(r.commodityId) ?? '').toLowerCase()
      const coop = cooperativeMap.get(r.cooperativeId)
      const coopName = (coop?.name ?? '').toLowerCase()
      const where = [coop?.district, coop?.province].filter(Boolean).join(' ').toLowerCase()
      const notes = (r.notes ?? '').toLowerCase()

      return comm.includes(q) || coopName.includes(q) || where.includes(q) || notes.includes(q)
    })
  }, [requests, statusFilter, searchQuery, commodityMap, cooperativeMap])

  const sorted = useMemo(() => {
    const compare: Record<SortKey, (a: SupplyRequest, b: SupplyRequest) => number> = {
      commodity: (a, b) =>
        (commodityMap.get(a.commodityId) ?? '').localeCompare(commodityMap.get(b.commodityId) ?? ''),
      cooperative: (a, b) => {
        const nameA = cooperativeMap.get(a.cooperativeId)?.name ?? ''
        const nameB = cooperativeMap.get(b.cooperativeId)?.name ?? ''
        return nameA.localeCompare(nameB)
      },
      volume: (a, b) => a.volumeKg - b.volumeKg,
      window: (a, b) => a.windowStart.localeCompare(b.windowStart),
      created: (a, b) => a.createdAt.localeCompare(b.createdAt),
      status: (a, b) => a.status.localeCompare(b.status),
    }
    const copy = [...filtered].sort(compare[sortKey])
    if (sortDesc) copy.reverse()
    return copy
  }, [filtered, sortKey, sortDesc, commodityMap, cooperativeMap])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDesc(desc => !desc)
    } else {
      setSortKey(key)
      setSortDesc(key === 'created')
    }
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        title="Belum ada pengajuan permintaan pasokan"
        description="Jelajahi komoditas panen yang diproyeksikan koperasi di katalog, lalu ajukan volume dan minggu yang Anda butuhkan."
        action={
          <Link
            href="/catalog"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'interactive gap-2 font-medium bg-[var(--terrion-green-700)] hover:bg-[var(--terrion-green-900)] text-white shadow-xs',
            )}
          >
            <Store className="size-4" />
            Jelajahi Katalog Pasokan
          </Link>
        }
      />
    )
  }

  const detailCommName = detailRequest
    ? (commodityMap.get(detailRequest.commodityId) ?? 'Komoditas')
    : ''
  const detailCoop = detailRequest ? cooperativeMap.get(detailRequest.cooperativeId) : null
  const parsedDetailNotes = detailRequest
    ? parseNotes(detailRequest.notes)
    : { deliveryPref: null, extraNotes: '' }

  return (
    <div className="flex flex-col gap-6">
      {/* ─── METRIC ROW ─────────────────────────────────────────────────── */}
      <MetricRow items={kpis} />

      {/* ─── TABLE TOOLBAR ──────────────────────────────────────────────── */}
      <TableToolbar
        meta={
          <span className="text-xs text-muted-foreground tabular-nums">
            {sorted.length} dari {requests.length} permintaan
          </span>
        }
      >
        <SegmentedControl
          ariaLabel="Saring menurut status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTERS.map(filter => ({
            value: filter,
            label: REQUEST_STATUS_LABEL[filter],
            count:
              filter === 'all'
                ? requests.length
                : requests.filter(r => r.status === filter).length,
          }))}
        />

        <div className="relative min-w-48 sm:min-w-64">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cari komoditas, koperasi, wilayah..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="interactive h-8.5 w-full rounded-md border border-input bg-card pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground hover:border-[var(--terrion-green-300)] focus:border-ring focus:outline-none"
          />
        </div>
      </TableToolbar>

      {/* ─── DATA TABLE ─────────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <p className="py-12 text-center text-xs text-muted-foreground">
          Tidak ada permintaan{' '}
          {statusFilter !== 'all'
            ? `berstatus ${REQUEST_STATUS_LABEL[statusFilter].toLowerCase()}`
            : ''}{' '}
          {searchQuery ? `dengan kata kunci "${searchQuery}"` : ''}.
        </p>
      ) : (
        <TableFrame maxHeight="min(38rem, 65vh)">
          <Table>
            <THead>
              <tr>
                <SortableTh
                  label="Komoditas"
                  active={sortKey === 'commodity'}
                  desc={sortDesc}
                  onSort={() => toggleSort('commodity')}
                />
                <SortableTh
                  label="Koperasi mitra"
                  active={sortKey === 'cooperative'}
                  desc={sortDesc}
                  onSort={() => toggleSort('cooperative')}
                />
                <SortableTh
                  label="Volume"
                  numeric
                  active={sortKey === 'volume'}
                  desc={sortDesc}
                  onSort={() => toggleSort('volume')}
                />
                <SortableTh
                  label="Jendela panen"
                  active={sortKey === 'window'}
                  desc={sortDesc}
                  onSort={() => toggleSort('window')}
                />
                <SortableTh
                  label="Diajukan"
                  active={sortKey === 'created'}
                  desc={sortDesc}
                  onSort={() => toggleSort('created')}
                />
                <SortableTh
                  label="Status"
                  active={sortKey === 'status'}
                  desc={sortDesc}
                  onSort={() => toggleSort('status')}
                />
                <Th className="text-right">Aksi</Th>
              </tr>
            </THead>
            <TBody>
              {sorted.map(r => {
                const commName = commodityMap.get(r.commodityId) ?? 'Komoditas'
                const coop = cooperativeMap.get(r.cooperativeId)
                const where = [coop?.district, coop?.province].filter(Boolean).join(', ')

                return (
                  <tr
                    key={r.id}
                    onClick={() => setDetailRequest(r)}
                    className="group cursor-pointer transition-colors hover:bg-[var(--terrion-green-50)]/40"
                  >
                    {/* Komoditas */}
                    <Td className="font-semibold text-foreground text-sm">
                      <div className="flex items-center gap-2.5">
                        <CropMark name={commName} />
                        <span>{commName}</span>
                      </div>
                    </Td>

                    {/* Koperasi Mitra */}
                    <Td className="max-w-64">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground text-sm truncate">
                          {coop?.name ?? 'Koperasi Mitra'}
                        </span>
                        {where && (
                          <span className="text-[0.6875rem] text-muted-foreground truncate">
                            {where}
                          </span>
                        )}
                      </div>
                    </Td>

                    {/* Volume */}
                    <Td numeric className="font-semibold text-foreground text-sm tabular-nums">
                      {formatNumberId(r.volumeKg / 1000)} ton
                    </Td>

                    {/* Jendela Panen */}
                    <Td>
                      <HarvestWindow
                        size="sm"
                        week={{
                          start: utcDate(r.windowStart),
                          end: utcDate(r.windowEnd),
                          basis: 'observed',
                        }}
                      />
                    </Td>

                    {/* Tanggal Diajukan */}
                    <Td className="text-xs text-muted-foreground tabular-nums">
                      {formatDateId(utcDate(r.createdAt.slice(0, 10)))}
                    </Td>

                    {/* Status Badge */}
                    <Td>
                      <Badge tone={STATUS_TONE[r.status]}>
                        {REQUEST_STATUS_LABEL[r.status]}
                      </Badge>
                    </Td>

                    {/* Action */}
                    <Td className="text-right" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailRequest(r)}
                        className="interactive text-xs"
                      >
                        Lihat detail
                      </Button>
                    </Td>
                  </tr>
                )
              })}
            </TBody>
          </Table>
        </TableFrame>
      )}

      {/* ─── DETAIL MODAL DIALOG ────────────────────────────────────────── */}
      <Dialog.Root open={!!detailRequest} onOpenChange={open => !open && setDetailRequest(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-xs transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup
            className={cn(
              'fixed top-1/2 left-1/2 z-50 w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2',
              'max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-xl)] sm:p-6',
              'transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
              'data-[starting-style]:opacity-0 data-[starting-style]:scale-95',
              'data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
            )}
          >
            {detailRequest && (
              <div className="flex flex-col gap-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <Dialog.Title className="text-lg font-semibold text-foreground">
                        Detail Permintaan Pasokan
                      </Dialog.Title>
                      <Badge tone={STATUS_TONE[detailRequest.status]}>
                        {REQUEST_STATUS_LABEL[detailRequest.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Diajukan pada {formatDateId(utcDate(detailRequest.createdAt.slice(0, 10)))}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailRequest(null)}
                    className="interactive rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Tutup"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Definition Grid */}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Komoditas</dt>
                    <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CropMark name={detailCommName} />
                      <span>{detailCommName}</span>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-muted-foreground">Volume Dipesan</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                      {formatNumberId(detailRequest.volumeKg / 1000)} ton (
                      {formatNumberId(detailRequest.volumeKg)} kg)
                    </dd>
                  </div>

                  <div>
                    <dt className="text-muted-foreground">Koperasi Mitra</dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                        <span>{detailCoop?.name ?? 'Koperasi Mitra'}</span>
                      </div>
                      {(detailCoop?.district || detailCoop?.province) && (
                        <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3 shrink-0" />
                          <span>{[detailCoop?.district, detailCoop?.province].filter(Boolean).join(', ')}</span>
                        </p>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-muted-foreground">Jendela Panen Diminta</dt>
                    <dd className="mt-1">
                      <HarvestWindow
                        size="sm"
                        week={{
                          start: utcDate(detailRequest.windowStart),
                          end: utcDate(detailRequest.windowEnd),
                          basis: 'observed',
                        }}
                      />
                    </dd>
                  </div>

                  <div>
                    <dt className="text-muted-foreground">Preferensi Pengiriman</dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      {parsedDetailNotes.deliveryPref ?? 'Sesuai kesepakatan'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-muted-foreground">Status Keputusan</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">
                      {detailRequest.respondedAt ? (
                        <span>
                          Ditanggapi pada {formatDateId(utcDate(detailRequest.respondedAt.slice(0, 10)))}
                        </span>
                      ) : (
                        <span>Sedang dalam proses review kuota pengurus</span>
                      )}
                    </dd>
                  </div>
                </dl>

                {/* Extra Notes section */}
                {parsedDetailNotes.extraNotes && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3.5 text-xs">
                    <p className="font-semibold text-foreground">Catatan Tambahan Anda</p>
                    <p className="mt-1 whitespace-pre-line leading-relaxed text-muted-foreground">
                      {parsedDetailNotes.extraNotes}
                    </p>
                  </div>
                )}

                {/* Status Guidance Alert */}
                {detailRequest.status === 'accepted' && (
                  <div className="rounded-lg border border-[var(--terrion-green-200)] bg-[var(--terrion-green-50)] p-3.5 text-xs text-[var(--terrion-green-900)]">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--terrion-green-700)]">
                      <CheckCircle2 className="size-4 shrink-0" />
                      Permintaan Disetujui Pengurus Koperasi
                    </div>
                    <p className="mt-1 leading-relaxed text-muted-foreground">
                      Alokasi tonase panen telah dikunci untuk Anda. Silakan hubungi pengurus{' '}
                      <strong>{detailCoop?.name ?? 'koperasi'}</strong> untuk koordinasi jadwal armada pengangkut, gudang serah terima, dan kelengkapan administrasi kontrak.
                    </p>
                  </div>
                )}

                {detailRequest.status === 'declined' && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-destructive">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="size-4 shrink-0" />
                      Permintaan Belum Dapat Dipenuhi
                    </div>
                    <p className="mt-1 leading-relaxed text-muted-foreground">
                      Kapasitas pasokan panen pada minggu yang dipilih telah habis dialokasikan. Anda dapat mencari kuota panen pengganti di katalog.
                    </p>
                  </div>
                )}

                {/* Footer Action */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  {detailRequest.status === 'declined' ? (
                    <Link
                      href="/catalog"
                      className={cn(
                        buttonVariants({ size: 'sm' }),
                        'interactive gap-2 font-medium bg-[var(--terrion-green-700)] hover:bg-[var(--terrion-green-900)] text-white shadow-xs',
                      )}
                    >
                      <Store className="size-4" />
                      Cari di Katalog
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      ID: {detailRequest.id}
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    {/* The other half of the introduction. A buyer whose
                        contract was accepted still has to arrange a lorry, and
                        Terrion carries no messaging to arrange it in. */}
                    <WhatsAppButton
                      phone={detailRequest.cooperativePhone}
                      message={requestMessageToCooperative(
                        detailRequest, commodityMap.get(detailRequest.commodityId) ?? 'komoditas')}
                      label="Hubungi koperasi"
                    />

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailRequest(null)}
                    >
                      Tutup
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
