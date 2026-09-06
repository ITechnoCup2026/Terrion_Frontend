import Link from 'next/link'

import { Badge } from '@/components/ui/Badge'
import { formatNumberId } from '@/lib/format/number'
import { formatDateId } from '@/lib/harvest/format'
import { daysToHarvest, yieldPerHa, type HarvestRecord } from '@/lib/harvest/history'

/**
 * The recorded harvests, newest first.
 *
 * A table rather than cards: these rows are compared with each other — this
 * variety against that one, this member's yield against the cooperative's —
 * and comparison wants columns that line up.
 *
 * `Harga` and `Dibayar` are frequently blank, and they stay blank rather than
 * showing 0. A price of nothing and a price not yet known are different facts,
 * and the second is the ordinary one: the buyer usually weighs before anyone
 * agrees a figure.
 */
export function HarvestHistoryTable({ records }: { records: HarvestRecord[] }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[52rem] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">Lahan</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Komoditas</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Luas</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Tanam → panen</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Hasil</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Per ha</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Harga</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Dibayar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map(record => {
            const perHa = yieldPerHa(record)
            return (
              <tr key={record.blockId} className="align-top">
                <td className="px-4 py-3">
                  <Link
                    href={`/plots/${record.plotId}`}
                    className="interactive font-medium text-foreground hover:underline"
                  >
                    {record.plotName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {record.blockLabel}
                    {record.memberName ? ` · ${record.memberName}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-foreground">{record.commodityName}</p>
                  <p className="text-xs text-muted-foreground">{record.varietyName}</p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {formatNumberId(record.areaHa, 2)} ha
                </td>
                <td className="px-4 py-3">
                  <p className="text-foreground">{formatDateId(record.harvestDate)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumberId(daysToHarvest(record), 0)} hari setelah tanam
                  </p>
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                  {formatNumberId(record.actualYieldKg / 1000, 2)} t
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {perHa === null ? '—' : `${formatNumberId(perHa, 2)} t`}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {record.pricePerKg === null
                    ? '—'
                    : `Rp ${formatNumberId(record.pricePerKg, 0)}`}
                </td>
                <td className="px-4 py-3">
                  {record.paymentDate === null
                    ? <Badge tone="neutral">Belum</Badge>
                    : <span className="text-xs text-muted-foreground">
                        {formatDateId(record.paymentDate)}
                      </span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
