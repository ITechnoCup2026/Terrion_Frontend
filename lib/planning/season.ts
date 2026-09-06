/**
 * Which seasons a pengurus may plan for, and what each one is called.
 *
 * Terrion already thinks in the two Indonesian planting seasons — MT I runs
 * October to March, MT II April to September — and the plot form already
 * offers both as shortcuts. The planner reuses that frame rather than letting
 * anyone type a date range, which is decision K2 in
 * `docs/RENCANA_KERJA_FITUR_RENCANA_TANAM.md`: it deletes a whole class of
 * question ("may the season be 45 days?") and makes two seasons comparable.
 *
 * The label is the API's own key. `GET /api/plans/propose?season=` takes it
 * verbatim and `POST /api/plans` echoes it back, so the format below is a
 * contract, not a display choice. MT I spans a new year and is named for both
 * ("MT I 2026/2027"); MT II sits inside one ("MT II 2027").
 *
 * Everything here reads and writes UTC. A season boundary rendered in local
 * time shows a pengurus in WIB the last day of the previous season.
 */

export type SeasonKind = 'I' | 'II'

export type SeasonOption = {
  /** The API key: "MT I 2026/2027" or "MT II 2027". */
  label: string
  kind: SeasonKind
  /** The year the season starts in. */
  year: number
  /** "2026-10-01" */
  start: string
  /** "2027-03-31" */
  end: string
  /** "Okt 2026 – Mar 2027" — for the picker, never sent anywhere. */
  range: string
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
] as const

function iso(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export function seasonLabel(kind: SeasonKind, year: number): string {
  return kind === 'I' ? `MT I ${year}/${year + 1}` : `MT II ${year}`
}

/** One season, fully described, from its kind and starting year. */
export function seasonOption(kind: SeasonKind, year: number): SeasonOption {
  // MT I: 1 Oct year .. 31 Mar year+1.  MT II: 1 Apr year .. 30 Sep year.
  const start = kind === 'I' ? iso(year, 9, 1) : iso(year, 3, 1)
  const end = kind === 'I' ? iso(year + 1, 2, 31) : iso(year, 8, 30)
  const range = kind === 'I'
    ? `${MONTHS_SHORT[9]} ${year} – ${MONTHS_SHORT[2]} ${year + 1}`
    : `${MONTHS_SHORT[3]} – ${MONTHS_SHORT[8]} ${year}`

  return { label: seasonLabel(kind, year), kind, year, start, end, range }
}

/** The season a given day falls inside. */
export function seasonAt(date: Date): SeasonOption {
  const month = date.getUTCMonth()
  const year = date.getUTCFullYear()

  // Jan–Mar belongs to the MT I that started the previous October.
  if (month <= 2) return seasonOption('I', year - 1)
  if (month <= 8) return seasonOption('II', year)
  return seasonOption('I', year)
}

/** The season immediately after this one. */
export function nextSeason(season: SeasonOption): SeasonOption {
  return season.kind === 'I'
    ? seasonOption('II', season.year + 1)
    : seasonOption('I', season.year)
}

/**
 * The seasons the picker offers: the one running now, then the ones after it.
 *
 * The current season is kept on the list even though its planting window has
 * usually closed — the backend answers `plan_season_closed` for that, and a
 * refusal that names the season is more useful than silently hiding it.
 */
export function upcomingSeasons(today: Date, count = 4): SeasonOption[] {
  const out: SeasonOption[] = [seasonAt(today)]
  while (out.length < count) out.push(nextSeason(out[out.length - 1]))
  return out
}

/**
 * The season a pengurus most likely wants: the next one, not the current one.
 *
 * The whole point of the feature is that the decision is taken before planting
 * starts, so the default target is the season that has not begun.
 */
export function defaultSeason(today: Date): SeasonOption {
  return nextSeason(seasonAt(today))
}
