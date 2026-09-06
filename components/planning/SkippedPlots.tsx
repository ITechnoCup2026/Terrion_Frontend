import { Card, CardHeader } from '@/components/ui/Card'
import type { SkippedPlotResponse } from '@/lib/planning/types'

/**
 * The plots that did not make it into the plan, and why.
 *
 * Never hidden, never collapsed away by default. A pengurus who finds a
 * member's land missing from a plan with no explanation concludes the system
 * lost it — and they are right to: an omission with no reason attached is
 * indistinguishable from a bug. The backend already writes each reason as a
 * finished Indonesian sentence, so this prints it unchanged.
 */
export function SkippedPlots({ skipped }: { skipped: SkippedPlotResponse[] }) {
  if (skipped.length === 0) return null

  return (
    <Card pad="lg" className="flex flex-col gap-4">
      <CardHeader
        title={`Lahan yang dilewati (${skipped.length})`}
        description="Lahan ini tidak masuk ke rencana mana pun. Alasannya disebutkan agar tidak terbaca sebagai lahan yang hilang."
      />
      <ul className="flex flex-col gap-2.5">
        {skipped.map(plot => (
          <li
            key={plot.plot_id}
            className="flex flex-col gap-0.5 border-l-2 border-border pl-3 text-sm"
          >
            <span className="font-medium text-foreground">
              {plot.plot_name}
              <span className="font-normal text-muted-foreground"> · {plot.member_name}</span>
            </span>
            <span className="text-xs leading-relaxed text-muted-foreground">{plot.reason}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
