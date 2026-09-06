import { TriangleAlert } from 'lucide-react'

import { formatNumberId } from '@/lib/format/number'
import type { MemberArea } from '@/lib/planning/members'
import { SUBSIDY_CAP_HA } from '@/lib/rdkk/aggregate'

/**
 * Who a plan pushes past the subsidised-fertiliser ceiling, by name.
 *
 * Named rather than counted, because "2 anggota" is a statistic and "Pak
 * Endang" is a phone call. The wording matches the RDKK screen deliberately:
 * the cap flags, it never truncates — the land is still planted, the excess is
 * simply not subsidised, and knowing that in November is the difference
 * between a decision and a surprise.
 *
 * Shared by the candidate card and the saved plan, so the sentence a pengurus
 * reads while choosing is the same sentence they read afterwards.
 */
export function SubsidyCapNote({
  members,
  /** How many to name before falling back to a count. Cards have less room. */
  limit = 2,
}: {
  members: MemberArea[]
  limit?: number
}) {
  if (members.length === 0) return null

  const shown = members.slice(0, limit)
  const rest = members.length - shown.length

  return (
    <p className="flex gap-2 text-[0.6875rem] leading-snug text-muted-foreground">
      <TriangleAlert
        aria-hidden
        className="mt-px size-3.5 shrink-0 text-[var(--terrion-gold-600)]"
      />
      <span>
        <span className="font-medium text-foreground">
          {formatNumberId(members.length, 0)} anggota melewati batas subsidi {SUBSIDY_CAP_HA} ha
        </span>
        {': '}
        {shown.map(m => `${m.memberName} (${formatNumberId(m.areaHa)} ha)`).join(', ')}
        {rest > 0 && ` dan ${formatNumberId(rest, 0)} lainnya`}. Luas di atas batas tetap ditanam,
        hanya pupuknya yang tidak bersubsidi.
      </span>
    </p>
  )
}
