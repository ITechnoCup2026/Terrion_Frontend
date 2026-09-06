import Link from 'next/link'

import { Badge } from '@/components/ui/Badge'
import { Table, TableFrame, TBody, Td, Th, THead } from '@/components/ui/DataTable'
import { utcDate } from '@/lib/agronomy/dates'
import { formatDateId } from '@/lib/harvest/format'
import { OBJECTIVE_COPY } from '@/lib/planning/copy'
import type { SeasonPlanResponse } from '@/lib/planning/types'

/**
 * Every plan the cooperative has saved, applied and cancelled alike.
 *
 * A cancelled plan stays on the list rather than disappearing. It is the
 * record of a decision that was taken and then reversed, and a season whose
 * plan vanished without trace is a season nobody can explain afterwards.
 *
 * The list carries no assignments — `GET /api/plans` answers with `items: []`
 * for every row by contract — so nothing here may count or total them. The
 * detail page is the only place the contents exist.
 */
export function PlansTable({ plans }: { plans: SeasonPlanResponse[] }) {
  return (
    <TableFrame>
      <Table>
        <THead>
          <tr>
            <Th>Musim</Th>
            <Th>Tujuan</Th>
            <Th>Keadaan</Th>
            <Th>Disusun</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {plans.map(plan => (
            <tr key={plan.id}>
              <Td className="font-medium text-foreground">
                {plan.season_label}
                <span className="block text-[0.6875rem] font-normal text-muted-foreground">
                  {formatDateId(utcDate(plan.season_start))} – {formatDateId(utcDate(plan.season_end))}
                </span>
              </Td>
              <Td className="text-muted-foreground">{OBJECTIVE_COPY[plan.objective]?.label ?? plan.objective}</Td>
              <Td>
                {plan.status === 'applied'
                  ? <Badge tone="positive">Berjalan</Badge>
                  : <Badge tone="neutral">Dibatalkan</Badge>}
              </Td>
              <Td className="whitespace-nowrap text-muted-foreground">
                {formatDateId(utcDate(plan.created_at))}
                {plan.cancelled_at && (
                  <span className="block text-[0.6875rem]">
                    dibatalkan {formatDateId(utcDate(plan.cancelled_at))}
                  </span>
                )}
              </Td>
              <Td>
                <Link
                  href={`/rencana/${plan.id}`}
                  className="interactive text-xs font-semibold text-[var(--terrion-green-700)] hover:underline"
                >
                  Lihat rencana
                </Link>
              </Td>
            </tr>
          ))}
        </TBody>
      </Table>
    </TableFrame>
  )
}
