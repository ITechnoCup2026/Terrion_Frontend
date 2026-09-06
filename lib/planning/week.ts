import { addDays, isoWeekStart } from '@/lib/agronomy/dates'
import { formatHarvestRange } from '@/lib/harvest/format'

/**
 * An ISO week key back into the week a pengurus can point at on a calendar.
 *
 * The planner flags weeks as `"2027-W03"`, which is the right key and the
 * wrong sentence: nobody plans a harvest by ordinal week number, and a
 * cooperative reading "2027-W03" cannot tell whether that is before or after
 * the rain starts. Every flagged week on screen is therefore shown as its
 * dates, with the key kept beside it so it can still be matched against the
 * backend's own output.
 *
 * The inverse of `isoWeekKey` in lib/agronomy/dates: 4 January is in ISO week
 * 1 of its year by definition, so week n starts (n-1) weeks after that week's
 * Monday. Doing it that way rather than from 1 January is what keeps a season
 * spanning New Year from landing a week out.
 */
export function isoWeekMonday(key: string): Date | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(key.trim())
  if (!match) return null

  const year = Number(match[1])
  const week = Number(match[2])
  if (week < 1 || week > 53) return null

  return addDays(isoWeekStart(new Date(Date.UTC(year, 0, 4))), (week - 1) * 7)
}

/** "2027-W03" → "19–25 Jan 2027". Unparseable keys are returned unchanged. */
export function formatIsoWeek(key: string): string {
  const monday = isoWeekMonday(key)
  if (!monday) return key

  const sunday = addDays(monday, 6)
  const range = formatHarvestRange(monday, sunday)

  // formatHarvestRange drops the year inside a single one, which is right on a
  // plot's harvest window and wrong here: a plan spans two calendar years and
  // its flagged weeks are read against each other.
  return range.includes(String(sunday.getUTCFullYear()))
    ? range
    : `${range} ${sunday.getUTCFullYear()}`
}
