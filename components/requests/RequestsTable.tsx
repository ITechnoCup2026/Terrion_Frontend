'use client'

import { useMemo, useState, useTransition } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  MinusCircle,
  Search,
  Store,
  Truck,
  X,
  XCircle,
} from 'lucide-react'

import { respondToRequest } from '@/app/actions/supply-request'
import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { WhatsAppButton } from '@/components/commerce/WhatsAppButton'
import { requestMessageToBuyer } from '@/lib/supply-requests/message'
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
import { INBOX_EMPTY, REQUEST_STATUS_LABEL, requestBuyerLabel } from '@/lib/catalog/copy'
import { formatDateId } from '@/lib/harvest/format'
import { formatNumberId } from '@/lib/format/number'
import type { SupplyRequest } from '@/lib/supply-requests/load'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | SupplyRequest['status']
type SortKey = 'commodity' | 'volume' | 'window' | 'status'
type Decision = 'accepted' | 'declined'

const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'accepted', 'declined', 'withdrawn']

const STATUS_TONE: Record<SupplyRequest['status'], 'neutral' | 'positive' | 'negative' | 'warning'> = {
  pending: 'warning',
  accepted: 'positive',
  declined: 'negative',
  withdrawn: 'neutral',
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

export function RequestsTable({
  rows: initialRows,
  commodityName,
}: {
  rows: SupplyRequest[]
  commodityName: Map<string, string>
}) {
  const [rows, setRows] = useState(initialRows)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('window')
  const [sortDesc, setSortDesc] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailRequest, setDetailRequest] = useState<SupplyRequest | null>(null)
  const [rowErrors, setRowErrors] = useState<Map<string, string>>(new Map())
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      if (!matchStatus) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const comm = (commodityName.get(r.commodityId) ?? '').toLowerCase()
      const buyer = (requestBuyerLabel(r.buyerName, r.buyerOrganisation) ?? '').toLowerCase()
      const notes = (r.notes ?? '').toLowerCase()
      return comm.includes(q) || buyer.includes(q) || notes.includes(q)
    })
  }, [rows, statusFilter, searchQuery, commodityName])

  const sorted = useMemo(() => {
    const compare: Record<SortKey, (a: SupplyRequest, b: SupplyRequest) => number> = {
      commodity: (a, b) =>
        (commodityName.get(a.commodityId) ?? '').localeCompare(commodityName.get(b.commodityId) ?? ''),
      volume: (a, b) => a.volumeKg - b.volumeKg,
      window: (a, b) => a.windowStart.localeCompare(b.windowStart),
      status: (a, b) => a.status.localeCompare(b.status),
    }
    const copy = [...filtered].sort(compare[sortKey])
    if (sortDesc) copy.reverse()
    return copy
  }, [filtered, sortKey, sortDesc, commodityName])

  const pendingIds = useMemo(
    () => new Set(sorted.filter(r => r.status === 'pending').map(r => r.id)),
    [sorted],
  )
  const selectedPending = [...selected].filter(id => pendingIds.has(id))
  const allPendingSelected = pendingIds.size > 0 && selectedPending.length === pendingIds.size

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(desc => !desc)
    else {
      setSortKey(key)
      setSortDesc(false)
    }
  }

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function respond(ids: string[], decision: Decision) {
    startTransition(async () => {
      const results = await Promise.all(
        ids.map(async id => [id, await respondToRequest({ requestId: id, decision })] as const),
      )

      setRowErrors(prev => {
        const next = new Map(prev)
        for (const [id, result] of results) {
          if (result.ok) next.delete(id)
          else next.set(id, result.message)
        }
        return next
      })
      setRows(prev =>
        prev.map(r => {
          const outcome = results.find(([id]) => id === r.id)?.[1]
          return outcome?.ok ? { ...r, status: decision } : r
        }),
      )
      setSelected(prev => {
        const next = new Set(prev)
        for (const [id, result] of results) if (result.ok) next.delete(id)
        return next
      })

      // Update active detail modal request if open
      if (detailRequest && ids.includes(detailRequest.id)) {
        const updated = results.find(([id]) => id === detailRequest.id)?.[1]
        if (updated?.ok) {
          setDetailRequest(prev => (prev ? { ...prev, status: decision } : null))
        }
      }
    })
  }

  if (rows.length === 0) return <EmptyState {...INBOX_EMPTY} />

  const activeCommName = detailRequest ? (commodityName.get(detailRequest.commodityId) ?? 'Komoditas') : ''
  const parsedActiveNotes = detailRequest ? parseNotes(detailRequest.notes) : { deliveryPref: null, extraNotes: '' }

  return (
    <div className="flex flex-col gap-4">
      {/* Control Bar */}
      <TableToolbar
        meta={
          <span className="text-xs text-muted-foreground tabular-nums">
            {sorted.length} dari {rows.length} permintaan
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
            count: filter === 'all' ? rows.length : rows.filter(r => r.status === filter).length,
          }))}
        />

        <div className="relative min-w-48 sm:min-w-64">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari komoditas atau pembeli..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="interactive h-8.5 w-full rounded-md border border-input bg-card pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
      </TableToolbar>

      {selectedPending.length > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--terrion-gold-500)]/40 bg-[var(--terrion-gold-50)] px-4 py-2.5 text-xs font-medium text-foreground shadow-xs">
          <span className="font-semibold text-[var(--terrion-gold-600)]">
            {selectedPending.length} permintaan dipilih
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => respond(selectedPending, 'accepted')}
            >
              Terima terpilih
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => respond(selectedPending, 'declined')}
            >
              Tolak terpilih
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          Tidak ada permintaan {statusFilter !== 'all' ? `berstatus ${REQUEST_STATUS_LABEL[statusFilter].toLowerCase()}` : ''} {searchQuery ? `dengan kata kunci "${searchQuery}"` : ''}.
        </p>
      ) : (
        <TableFrame maxHeight="min(38rem, 65vh)">
          <Table>
            <THead>
              <tr>
                <Th className="w-10 text-center">
                  <input
                    type="checkbox"
                    className="accent-primary size-3.5 cursor-pointer rounded"
                    checked={allPendingSelected}
                    disabled={pendingIds.size === 0}
                    aria-label="Pilih semua yang menunggu"
                    onChange={() => setSelected(allPendingSelected ? new Set() : new Set(pendingIds))}
                  />
                </Th>
                <SortableTh
                  label="Komoditas"
                  active={sortKey === 'commodity'}
                  desc={sortDesc}
                  onSort={() => toggleSort('commodity')}
                />
                <Th>Pembeli</Th>
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
                  label="Status"
                  active={sortKey === 'status'}
                  desc={sortDesc}
                  onSort={() => toggleSort('status')}
                />
                <Th>Aksi</Th>
              </tr>
            </THead>
            <TBody>
              {sorted.map(r => {
                const commName = commodityName.get(r.commodityId) ?? 'Komoditas'

                return (
                  <tr
                    key={r.id}
                    data-selected={selected.has(r.id) || undefined}
                    onClick={() => setDetailRequest(r)}
                    className="group cursor-pointer transition-colors hover:bg-muted/40 data-selected:bg-secondary/40"
                  >
                    <Td className="text-center" onClick={e => e.stopPropagation()}>
                      {r.status === 'pending' && (
                        <input
                          type="checkbox"
                          className="accent-primary size-3.5 cursor-pointer rounded"
                          checked={selected.has(r.id)}
                          aria-label={`Pilih permintaan ${r.id}`}
                          onChange={() => toggleSelected(r.id)}
                        />
                      )}
                    </Td>

                    {/* Commodity */}
                    <Td className="font-semibold text-foreground text-sm">
                      {commName}
                    </Td>

                    {/* Buyer Organization (Clean Single Line) */}
                    <Td className="max-w-72 font-medium text-foreground text-sm">
                      <span className="truncate">{requestBuyerLabel(r.buyerName, r.buyerOrganisation)}</span>
                    </Td>

                    {/* Volume */}
                    <Td numeric className="font-medium text-foreground text-sm">
                      {formatNumberId(r.volumeKg / 1000)} ton
                    </Td>

                    {/* Harvest Window */}
                    <Td>
                      <HarvestWindow
                        size="sm"
                        week={{ start: utcDate(r.windowStart), end: utcDate(r.windowEnd), basis: 'observed' }}
                      />
                    </Td>

                    {/* Status Badge */}
                    <Td>
                      <Badge tone={STATUS_TONE[r.status]}>
                        {REQUEST_STATUS_LABEL[r.status]}
                      </Badge>
                    </Td>

                    {/* Actions / Date */}
                    <Td className="min-w-36" onClick={e => e.stopPropagation()}>
                      {r.status === 'pending' ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => respond([r.id], 'accepted')}
                            >
                              Terima
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => respond([r.id], 'declined')}
                            >
                              Tolak
                            </Button>
                          </div>
                          {rowErrors.has(r.id) && (
                            <p className="text-[0.6875rem] text-destructive mt-0.5">
                              {rowErrors.get(r.id)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {r.respondedAt ? formatDateId(utcDate(r.respondedAt)) : '—'}
                        </span>
                      )}
                    </Td>
                  </tr>
                )
              })}
            </TBody>
          </Table>
        </TableFrame>
      )}

      {/* DETAIL DIALOG MODAL */}
      <Dialog.Root open={!!detailRequest} onOpenChange={open => !open && setDetailRequest(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup
            className={cn(
              'fixed top-1/2 left-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2',
              'max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-xl)] sm:p-6',
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
                        Permintaan Pasokan
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
                    <dd className="mt-1 text-sm font-semibold text-foreground">{activeCommName}</dd>
                  </div>

                  <div>
                    <dt className="text-muted-foreground">Volume Dipesan</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                      {formatNumberId(detailRequest.volumeKg / 1000)} ton ({formatNumberId(detailRequest.volumeKg)} kg)
                    </dd>
                  </div>

                  <div>
                    <dt className="text-muted-foreground">Pembeli / Organisasi</dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      {detailRequest.buyerOrganisation || detailRequest.buyerName}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-muted-foreground">Penanggung Jawab</dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      {detailRequest.buyerName}
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
                      {parsedActiveNotes.deliveryPref ?? 'Sesuai kesepakatan'}
                    </dd>
                  </div>
                </dl>

                {/* Extra Notes section (only if present) */}
                {parsedActiveNotes.extraNotes && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3.5 text-xs">
                    <p className="font-semibold text-foreground">Catatan Tambahan Pembeli</p>
                    <p className="mt-1 whitespace-pre-line leading-relaxed text-muted-foreground">
                      {parsedActiveNotes.extraNotes}
                    </p>
                  </div>
                )}

                {/* Status Timeline */}
                {detailRequest.respondedAt && (
                  <p className="text-[0.75rem] text-muted-foreground border-t border-border pt-3">
                    Keputusan diambil pada {formatDateId(utcDate(detailRequest.respondedAt.slice(0, 10)))}.
                  </p>
                )}

                {/* Footer Action */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  {detailRequest.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => respond([detailRequest.id], 'accepted')}
                      >
                        Setujui Permintaan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => respond([detailRequest.id], 'declined')}
                      >
                        Tolak Permintaan
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Permintaan berstatus {REQUEST_STATUS_LABEL[detailRequest.status].toLowerCase()}.
                    </span>
                  )}

                  {/* Reaching the buyer is useful at every status, not only
                      while a decision is pending: an accepted contract needs a
                      delivery conversation, and a declined one often needs an
                      explanation. */}
                  <WhatsAppButton
                    phone={detailRequest.buyerPhone}
                    message={requestMessageToBuyer(
                      detailRequest, commodityName.get(detailRequest.commodityId) ?? 'komoditas')}
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
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
