import { Badge } from '@/components/ui/Badge'
import { plausibilityCopy } from '@/lib/planning/copy'

/**
 * How much the simulated harvest window is worth trusting.
 *
 * The same four values the standing blocks already carry, drawn the same way,
 * so a pengurus reading a plan and a kader reading a plot see one vocabulary
 * rather than two. `implausible` is a real warning: the model does not stand
 * behind that window, and a row applied on it schedules the cooperative
 * against a date nothing supports.
 */
export function PlausibilityBadge({ value }: { value: string }) {
  const copy = plausibilityCopy(value)
  // The hint rides on a wrapping <span> rather than on <Badge>, which takes no
  // title: the badge is the shared surface and the planner does not get to
  // widen it for one caller.
  return (
    <span title={copy.hint}>
      <Badge tone={copy.tone}>{copy.label}</Badge>
    </span>
  )
}
