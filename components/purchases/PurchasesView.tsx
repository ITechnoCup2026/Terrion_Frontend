'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Dialog } from '@base-ui/react/dialog'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileSpreadsheet,
  Info,
  Layers,
  PieChart,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  Sliders,
  Truck,
  User,
  Users,
  X,
} from 'lucide-react'

import { CreateOrderButton } from '@/components/commerce/CreateOrderButton'
import { OrderStatusActions } from '@/components/commerce/OrderStatusActions'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Composition } from '@/components/ui/Composition'
import {
  SegmentedControl,
  Table,
  TableFrame,
  TableToolbar,
  TBody,
  Td,
  Th,
  THead,
} from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateId } from '@/lib/harvest/format'
import { formatNumberId } from '@/lib/format/number'
import { inputItemLabel } from '@/lib/rdkk/label'
import { SUBSIDY_CAP_HA } from '@/lib/rdkk/aggregate'
import type { InputOrder, RdkkRow, RdkkSeason } from '@/lib/rdkk/load'
import type { OrderLineDraft } from '@/lib/rdkk/order'
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  isAdjusted,
  isOrderOpen,
} from '@/lib/rdkk/status'
import type { InputOrderStatusRaw } from '@/lib/api/types'
import { cn } from '@/lib/utils'

// The words and tones live in lib/rdkk/status.ts, beside the rule about what
// may follow what. Only the icons are here, because they are React.
const ORDER_STATUS_ICON: Record<InputOrderStatusRaw, typeof Clock> = {
  draft: Clock,
  submitted: Truck,
  completed: CheckCircle2,
  cancelled: Ban,
}

type OrderStatusFilter = 'all' | InputOrderStatusRaw

export function PurchasesView({
  rdkk,
  lines,
  overCap,
  orders,
  canOrder,
}: {
  rdkk: RdkkSeason
  lines: OrderLineDraft[]
  overCap: RdkkRow[]
  orders: InputOrder[]
  canOrder: boolean
}) {
  const [activeTab, setActiveTab] = useState<'summary' | 'members'>('summary')
  const [memberSearch, setMemberSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all')
  // The id, not the order: after a status change router.refresh() brings a new
  // `orders` array, and a copy held in state here would keep showing the status
  // the reader just moved away from.
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const [displayLines, setDisplayLines] = useState<OrderLineDraft[]>(lines)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [draftSacks, setDraftSacks] = useState<Record<string, number>>({})

  const selectedOrder = useMemo(
    () => orders.find(o => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  )

  // One live order per season. The server enforces it -- a partial unique
  // index, so two tabs cannot both win -- and this is what lets the screen say
  // so before the click rather than after it.
  const openOrder = useMemo(
    () => orders.find(o => isOrderOpen(o.status)) ?? null,
    [orders],
  )

  const isCustomized = useMemo(() => {
    return displayLines.some((dl, i) => {
      const orig = lines[i]
      return orig && (dl.quantity !== orig.quantity || dl.quantityKg !== orig.quantityKg)
    })
  }, [displayLines, lines])

  const openEditModal = () => {
    const initMap: Record<string, number> = {}
    displayLines.forEach(l => {
      initMap[l.item] = l.quantity
    })
    setDraftSacks(initMap)
    setIsEditModalOpen(true)
  }

  const saveCustomLines = () => {
    const updated = displayLines.map(l => {
      const newQty = Math.max(0, draftSacks[l.item] ?? l.quantity)
      return {
        ...l,
        quantity: newQty,
        quantityKg: newQty * 50,
      }
    })
    setDisplayLines(updated)
    setIsEditModalOpen(false)
  }

  const resetToRdkk = () => {
    setDisplayLines(lines)
    setIsEditModalOpen(false)
  }

  // Filtered members for RDKK detail
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return rdkk.rows
    const q = memberSearch.toLowerCase()
    return rdkk.rows.filter(m => m.memberName.toLowerCase().includes(q))
  }, [rdkk.rows, memberSearch])

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter
      if (!matchStatus) return false

      if (!orderSearch.trim()) return true
      const q = orderSearch.toLowerCase()
      const seasonMatch = o.seasonLabel.toLowerCase().includes(q)
      const itemMatch = o.lines.some(l => inputItemLabel(l.item).toLowerCase().includes(q))
      return seasonMatch || itemMatch
    })
  }, [orders, orderStatusFilter, orderSearch])

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs Switcher for Requirement Summary vs Member Breakdown */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
              activeTab === 'summary'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <PieChart className="size-3.5 text-[var(--terrion-green-600)]" />
            Ringkasan Agregasi & Pesanan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
              activeTab === 'members'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Users className="size-3.5 text-[var(--terrion-green-600)]" />
            Rincian RDKK Per Anggota ({rdkk.rows.length})
          </button>
        </div>

        <Link
          href="/purchases/rdkk"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-xs')}
        >
          <FileSpreadsheet className="size-3.5" />
          Ekspor Cetak RDKK
        </Link>
      </div>

      {activeTab === 'summary' ? (
        <>
          {displayLines.length === 0 ? (
            <EmptyState
              title="Belum ada kebutuhan pupuk"
              description="Kebutuhan dihitung dari tanam yang tercatat 12 bulan terakhir. Daftarkan tanam untuk mengisi daftar ini."
              action={
                <Link href="/plots" className={buttonVariants({ variant: 'outline' })}>
                  Ke Menu Lahan / Tanam
                </Link>
              }
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column (2 cols): Main Breakdown & Actions */}
              <div className="flex flex-col gap-6 lg:col-span-2">
                <Card pad="none" className="overflow-hidden">
                  <CardHeader
                    className="p-5 border-b border-border bg-muted/20"
                    title={
                      <span className="flex items-center gap-2 text-base font-semibold">
                        <Layers className="size-4 text-[var(--terrion-green-600)]" />
                        Kebutuhan Musim Ini
                      </span>
                    }
                    description="Diagregasi dari setiap tanam yang tercatat 12 bulan terakhir."
                    actions={
                      <div className="flex items-center gap-2">
                        {isCustomized && (
                          <Badge tone="warning" className="font-medium gap-1">
                            Penyesuaian Manual
                          </Badge>
                        )}
                        <Badge tone="positive" className="font-medium">
                          {rdkk.rows.length} anggota · Karung {50} kg
                        </Badge>
                        {canOrder && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openEditModal}
                            className="h-8 text-xs gap-1.5 shadow-2xs"
                          >
                            <Edit3 className="size-3.5 text-[var(--terrion-green-600)]" />
                            Sesuaikan Kebutuhan
                          </Button>
                        )}
                      </div>
                    }
                  />

                  {/* Composition Visual Bar */}
                  <div className="p-5 border-b border-border">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Proporsi Alokasi Pupuk
                    </p>
                    <Composition
                      parts={displayLines.map(l => ({
                        key: l.item,
                        label: inputItemLabel(l.item),
                        value: `${formatNumberId(l.quantityKg / 1000)} ton`,
                        secondary: `${formatNumberId(l.quantity, 0)} karung`,
                        amount: l.quantityKg,
                      }))}
                    />
                  </div>

                  {/* Detailed Cards per Commodity Line */}
                  <div className="p-5">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Rincian Kuantitas Pupuk
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {displayLines.map(line => {
                        const ton = line.quantityKg / 1000
                        return (
                          <div
                            key={line.item}
                            className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/20 p-4 transition-all hover:border-[var(--terrion-green-300)]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-foreground">
                                {inputItemLabel(line.item)}
                              </span>
                              <Badge tone="neutral" className="text-xs font-mono">
                                {formatNumberId(line.quantity, 0)} karung
                              </Badge>
                            </div>
                            <div className="mt-3 flex items-baseline justify-between border-t border-border/40 pt-2">
                              <span className="text-xs text-muted-foreground">Kebutuhan murni:</span>
                              <span className="text-sm font-semibold tabular-nums text-foreground">
                                {formatNumberId(ton)} ton{' '}
                                <span className="text-xs font-normal text-muted-foreground">
                                  ({formatNumberId(line.quantityKg, 0)} kg)
                                </span>
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-5 rounded-lg border border-border/60 bg-muted/40 p-3.5 text-xs text-muted-foreground leading-relaxed">
                      <p className="flex items-start gap-1.5">
                        <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                        <span>
                          Jumlah karung dibulatkan ke atas — pupuk dijual per karung 50 kg. Memesan kurang dari kebutuhan berisiko menurunkan hasil panen anggota.
                        </span>
                      </p>

                      {rdkk.commoditiesWithoutRates.length > 0 && (
                        <p className="mt-2 text-xs text-destructive flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          {rdkk.commoditiesWithoutRates.length} komoditas belum punya acuan dosis, sehingga belum masuk dalam hitungan di atas.
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column (1 col): Order Action Box & Quick Rules */}
              <div className="flex flex-col gap-6">
                <Card className="flex flex-col gap-4 border-[var(--terrion-green-200)] bg-gradient-to-b from-[var(--terrion-green-50)]/30 to-card">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--terrion-green-100)] text-[var(--terrion-green-700)]">
                      <ShoppingCart className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Buat Pesanan Kelompok</h3>
                      <p className="text-xs text-muted-foreground">Resmi untuk pengurus koperasi</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Catat kebutuhan pupuk musim ini sebagai satu pesanan kelompok. Pesanan dimulai
                    sebagai draf; statusnya Anda perbarui sendiri saat formulirnya dibawa ke
                    distributor dan saat pupuknya datang.
                  </p>

                  {!canOrder ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
                      Hanya <strong className="font-semibold">pengurus</strong> yang dapat membuat dan
                      memperbarui pesanan kelompok. Sebagai kader, Anda dapat melihat rincian
                      kebutuhan musim ini.
                    </div>
                  ) : openOrder ? (
                    /* Not a disabled button with no explanation: the season already
                       has an order, and the useful thing is a way to reach it. A
                       second one would leave a distributor holding two forms for
                       one season with no way to tell which is live. */
                    <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs leading-relaxed text-foreground">
                        Sudah ada pesanan untuk musim ini —{' '}
                        <span className="font-semibold">{ORDER_STATUS_LABEL[openOrder.status]}</span>,
                        dibuat {formatDateId(openOrder.createdAt)}
                        {openOrder.createdByName ? ` oleh ${openOrder.createdByName}` : ''}.
                      </p>
                      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                        Selesaikan atau batalkan pesanan itu sebelum membuat yang baru.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedOrderId(openOrder.id)}
                        className="h-8 w-full justify-center gap-1.5 text-xs"
                      >
                        Buka pesanan itu
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <CreateOrderButton lines={displayLines} />
                      <p className="text-[0.75rem] text-muted-foreground">
                        {isCustomized
                          ? 'Pesanan dibuat dengan jumlah yang sudah Anda sesuaikan. Angka RDKK aslinya tetap tersimpan sebagai pembanding.'
                          : 'Pesanan dibuat persis sesuai hitungan RDKK musim ini.'}
                      </p>
                    </div>
                  )}
                </Card>

                {/* Over Subsidy Cap Alert Card */}
                {overCap.length > 0 && (
                  <Card tone="alert" className="border-amber-400/80 bg-amber-50/20">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {overCap.length} anggota melewati batas {SUBSIDY_CAP_HA} ha
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          Batas pupuk bersubsidi berlaku per petani. Luas di atas batas tetap dihitung dan diajukan terpisah, bukan dihapus.
                        </p>

                        <ul className="mt-3 space-y-1.5 text-xs">
                          {overCap.map(m => (
                            <li key={m.memberId} className="flex items-center justify-between rounded-md bg-card/80 p-2 border border-border/60">
                              <span className="font-medium text-foreground">{m.memberName}</span>
                              <span className="text-muted-foreground">
                                {formatNumberId(m.plantedHa)} ha{' '}
                                <span className="font-semibold text-destructive">
                                  (+{formatNumberId(m.excessHa)} ha)
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Tab 2: Rincian RDKK Per Anggota */
        <Card pad="none">
          <CardHeader
            className="p-4"
            title="Rincian Alokasi Pupuk Per Anggota"
            description="Detail perhitungan luas lahan dan kebutuhan pupuk individual yang membentuk total agregasi kelompok."
            actions={
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari nama anggota..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--terrion-green-500)]"
                />
              </div>
            }
          />

          <TableFrame maxHeight="32rem" className="rounded-none border-x-0 border-b-0">
            <Table>
              <THead>
                <tr>
                  <Th>No</Th>
                  <Th>Nama Anggota</Th>
                  <Th className="text-right">Luas Tanam (ha)</Th>
                  {rdkk.columns.map(col => (
                    <Th key={col} className="text-right uppercase">
                      {col} (kg)
                    </Th>
                  ))}
                  <Th>Status Kuota</Th>
                </tr>
              </THead>
              <TBody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <Td colSpan={4 + rdkk.columns.length} className="text-center py-8 text-muted-foreground">
                      Tidak ada anggota yang cocok dengan pencarian &ldquo;{memberSearch}&rdquo;.
                    </Td>
                  </tr>
                ) : (
                  filteredMembers.map((row, idx) => (
                    <tr key={row.memberId}>
                      <Td className="text-muted-foreground text-xs">{idx + 1}</Td>
                      <Td className="font-medium text-foreground">{row.memberName}</Td>
                      <Td className="text-right font-mono tabular-nums text-foreground">
                        {formatNumberId(row.plantedHa)}
                      </Td>
                      {row.quantitiesKg.map((qty, c) => (
                        <Td key={rdkk.columns[c]} className="text-right font-mono tabular-nums text-muted-foreground">
                          {qty === null ? '—' : `${formatNumberId(qty, 0)} kg`}
                        </Td>
                      ))}
                      <Td>
                        {row.overSubsidyCap ? (
                          <Badge tone="warning" className="text-xs">
                            +{formatNumberId(row.excessHa)} ha di atas batas
                          </Badge>
                        ) : (
                          <Badge tone="positive" className="text-xs">
                            Sesuai batas
                          </Badge>
                        )}
                      </Td>
                    </tr>
                  ))
                )}
              </TBody>
            </Table>
          </TableFrame>
        </Card>
      )}

      {/* History of Group Orders */}
      <Card pad="none">
        <CardHeader
          className="p-4"
          title={
            <span className="flex items-center gap-2">
              <Clock className="size-4 text-[var(--terrion-green-600)]" />
              Riwayat Pesanan Kelompok
            </span>
          }
          description="Daftar pesanan kelompok yang telah dibuat beserta status pemrosesannya."
          actions={
            <span className="text-xs text-muted-foreground font-medium">
              {orders.length} total pesanan
            </span>
          }
        />

        <TableToolbar className="border-t border-border">
          <SegmentedControl
            ariaLabel="Filter status pesanan"
            options={[
              { value: 'all', label: 'Semua', count: orders.length },
              { value: 'draft', label: 'Draf', count: orders.filter(o => o.status === 'draft').length },
              { value: 'submitted', label: 'Diajukan', count: orders.filter(o => o.status === 'submitted').length },
              { value: 'completed', label: 'Selesai', count: orders.filter(o => o.status === 'completed').length },
            ]}
            value={orderStatusFilter}
            onChange={val => setOrderStatusFilter(val as OrderStatusFilter)}
          />

          <div className="relative min-w-48 sm:min-w-64">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari riwayat pesanan..."
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
              className="interactive h-8.5 w-full rounded-md border border-input bg-card pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
          </div>
        </TableToolbar>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">
            Belum ada riwayat pesanan kelompok yang dibuat.
          </div>
        ) : (
          <TableFrame className="rounded-none border-x-0 border-b-0" maxHeight="24rem">
            <Table>
              <THead>
                <tr>
                  <Th>Tanggal</Th>
                  <Th>Dibuat oleh</Th>
                  <Th>Isi Pesanan</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Aksi</Th>
                </tr>
              </THead>
              <TBody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <Td colSpan={5} className="text-center py-6 text-muted-foreground">
                      Tidak ada pesanan yang sesuai filter.
                    </Td>
                  </tr>
                ) : (
                  filteredOrders.map(order => {
                    const StatusIcon = ORDER_STATUS_ICON[order.status]
                    return (
                      <tr
                        key={order.id}
                        className="interactive cursor-pointer hover:bg-muted/40"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <Td className="whitespace-nowrap text-muted-foreground text-xs font-mono">
                          {formatDateId(order.createdAt)}
                        </Td>
                        <Td className="text-xs">
                          {/* An em dash, not a blank: orders made before this
                              was recorded have no author to name, and that is
                              different from an author nobody bothered to show. */}
                          <span className="font-medium text-foreground">
                            {order.createdByName ?? '—'}
                          </span>
                          <span className="block text-[0.7rem] text-muted-foreground">
                            {order.seasonLabel}
                          </span>
                        </Td>
                        <Td className="text-xs text-muted-foreground">
                          {order.lines
                            .map(l => `${formatNumberId(l.quantity, 0)} ${l.unit} ${inputItemLabel(l.item)}`)
                            .join(', ')}
                          {isAdjusted(order) && (
                            <Badge tone="warning" className="ml-1.5 text-[0.65rem]">
                              disesuaikan
                            </Badge>
                          )}
                        </Td>
                        <Td>
                          <Badge tone={ORDER_STATUS_TONE[order.status]} className="gap-1 text-xs">
                            {StatusIcon && <StatusIcon className="size-3" />}
                            {ORDER_STATUS_LABEL[order.status]}
                          </Badge>
                          {order.statusChangedAt && (
                            <span className="block text-[0.7rem] text-muted-foreground">
                              {formatDateId(order.statusChangedAt)}
                              {order.statusChangedByName ? ` · ${order.statusChangedByName}` : ''}
                            </span>
                          )}
                        </Td>
                        <Td className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedOrderId(order.id)
                            }}
                            className="h-7 text-xs gap-1"
                          >
                            Detail
                            <ChevronRight className="size-3.5" />
                          </Button>
                        </Td>
                      </tr>
                    )
                  })
                )}
              </TBody>
            </Table>
          </TableFrame>
        )}

        {orders.length > 0 && (
          <p className="border-t border-border p-4 text-xs text-muted-foreground bg-muted/20">
            Status di atas adalah catatan, bukan perintah: pengadaan pupuk bersubsidi berjalan di
            luar Terrion — formulir RDKK dibawa ke distributor atau kios resmi, diverifikasi
            penyuluh, lewat e-RDKK. Pengurus memperbarui status di sini agar koperasi tahu berkasnya
            sedang di mana.
          </p>
        )}
      </Card>

      {/* Order Detail Modal */}
      <Dialog.Root open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrderId(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl focus:outline-none">
            {selectedOrder && (
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-border pb-3">
                  <div>
                    <Dialog.Title className="text-base font-bold text-foreground">
                      Detail Pesanan Kelompok
                    </Dialog.Title>
                    <Dialog.Description className="text-xs text-muted-foreground">
                      Dibuat {formatDateId(selectedOrder.createdAt)}
                      {selectedOrder.createdByName ? ` oleh ${selectedOrder.createdByName}` : ''}
                      {' · '}Musim: {selectedOrder.seasonLabel}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="size-4" />
                  </Dialog.Close>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status Pesanan:</span>
                    <Badge tone={ORDER_STATUS_TONE[selectedOrder.status]}>
                      {ORDER_STATUS_LABEL[selectedOrder.status]}
                    </Badge>
                  </div>
                  {/* Who moved it last, and when. Without this the buttons
                      below would still leave "siapa yang menyelesaikan pesanan
                      ini" unanswered. */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Terakhir diubah:</span>
                    <span className="flex items-center gap-1.5 text-foreground">
                      {selectedOrder.statusChangedAt ? (
                        <>
                          <User className="size-3 text-muted-foreground" />
                          {formatDateId(selectedOrder.statusChangedAt)}
                          {selectedOrder.statusChangedByName
                            ? ` · ${selectedOrder.statusChangedByName}`
                            : ''}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Belum pernah</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Daftar Barang Dipesan
                  </h4>
                  <div className="rounded-lg border border-border bg-muted/20 divide-y divide-border">
                    {selectedOrder.lines.map(line => (
                      <div key={line.item} className="flex items-center justify-between p-3 text-xs">
                        <span className="font-semibold text-foreground">{inputItemLabel(line.item)}</span>
                        <span className="text-right">
                          <span className="font-mono font-medium text-foreground">
                            {formatNumberId(line.quantity, 0)} {line.unit}
                          </span>
                          {/* Present only on a line somebody changed, so the
                              adjustment is visible as an adjustment rather than
                              as an RDKK that quietly disagrees with the form. */}
                          {line.quantityRdkk !== null && (
                            <span className="block text-[0.7rem] text-muted-foreground">
                              RDKK: {formatNumberId(line.quantityRdkk, 0)}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What happens next, and the only place a status changes from. */}
                <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Langkah berikutnya
                  </h4>
                  {canOrder ? (
                    <OrderStatusActions order={selectedOrder} />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Hanya pengurus yang dapat memperbarui status pesanan.
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Dialog.Close className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    Tutup
                  </Dialog.Close>
                </div>
              </div>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Requirement Edit Modal */}
      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl focus:outline-none">
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <Dialog.Title className="text-base font-bold text-foreground flex items-center gap-2">
                    <Sliders className="size-4 text-[var(--terrion-green-600)]" />
                    Sesuaikan Kebutuhan Pupuk
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                    Ubah jumlah karung yang dipesan secara manual tanpa mengubah data tanam RDKK dasar.
                  </Dialog.Description>
                </div>
                <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="size-4" />
                </Dialog.Close>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {displayLines.map(line => {
                  const currentSacks = draftSacks[line.item] ?? line.quantity
                  const currentTon = (currentSacks * 50) / 1000
                  const origLine = lines.find(l => l.item === line.item)
                  return (
                    <div
                      key={line.item}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {inputItemLabel(line.item)}
                        </p>
                        <p className="text-[0.7rem] text-muted-foreground">
                          RDKK Otomatis: {origLine ? origLine.quantity : 0} karung ({origLine ? formatNumberId(origLine.quantityKg / 1000) : 0} ton)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            value={currentSacks}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10)
                              setDraftSacks(prev => ({
                                ...prev,
                                [line.item]: isNaN(val) ? 0 : val,
                              }))
                            }}
                            className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--terrion-green-500)]"
                          />
                          <span className="text-xs text-muted-foreground font-medium">karung</span>
                        </div>
                        <span className="text-xs text-muted-foreground min-w-16 text-right font-mono">
                          ({formatNumberId(currentTon)} ton)
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetToRdkk}
                  className="text-xs text-muted-foreground gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  Reset ke RDKK
                </Button>
                <div className="flex items-center gap-2">
                  <Dialog.Close className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    Batal
                  </Dialog.Close>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveCustomLines}
                    className="gap-1.5"
                  >
                    <Save className="size-3.5" />
                    Simpan Penyesuaian
                  </Button>
                </div>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

