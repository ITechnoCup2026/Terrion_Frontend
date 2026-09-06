import type { MemberAreaRow } from './members'

/**
 * Finding one member's rows in a plan of forty-seven.
 *
 * Fase 3 of `docs/RENCANA_KERJA_FITUR_RENCANA_TANAM.md` asks for the
 * assignment list to be searchable and filterable, and says why in one line:
 * this is a screen for acting, not for reading. A pengurus opens it because
 * Pak Endang rang about his chilli, and a table sorted by nothing makes them
 * scroll past forty-six rows that are not his.
 *
 * Kept here rather than inside the component so the matching rules can be
 * tested and so both screens — the proposal being decided and the plan already
 * saved — search identically. A member who can be found before applying must
 * be findable afterwards.
 */

/**
 * Case- and accent-insensitive, whitespace-tolerant.
 *
 * Indonesian names on these screens are typed by whoever registered the member
 * — "Ujang", "ujang", " Ujang " — and a search that misses on capitalisation
 * would be read as "this member is not in the plan", which is a much worse
 * answer than a slow scroll.
 */
export function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Every word of the query must appear somewhere in the row's own words.
 *
 * Words, not the whole string: "ujang cabai" should find Pak Ujang's chilli
 * plot even though no single field contains that phrase. Order does not
 * matter, because the reader is recalling two facts, not typing a sentence.
 */
export function matchesSearch(haystack: readonly string[], query: string): boolean {
  const terms = normalise(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true

  const hay = haystack.map(normalise).join(' ')
  return terms.every(term => hay.includes(term))
}

export type MemberGroup<T> = {
  memberId: string
  memberName: string
  /** Total hectares assigned to this member within the rows given. */
  areaHa: number
  rows: T[]
}

/**
 * The plan re-cut the way it is acted on: one block per member, not per plot.
 *
 * Alphabetical by name. A plan ordered by tonnage or by plot id reads as a
 * ranking of members, which is both untrue and unhelpful — the pengurus is
 * looking somebody up, and a list you look somebody up in is sorted by name.
 * Indonesian collation, so "Éndang" files where a reader expects it.
 */
export function groupByMember<T extends MemberAreaRow>(rows: readonly T[]): MemberGroup<T>[] {
  const groups = new Map<string, MemberGroup<T>>()

  for (const row of rows) {
    const group = groups.get(row.member_id)
    if (group) {
      group.rows.push(row)
      group.areaHa += row.area_ha
    } else {
      groups.set(row.member_id, {
        memberId: row.member_id,
        memberName: row.member_name,
        areaHa: row.area_ha,
        rows: [row],
      })
    }
  }

  return [...groups.values()].sort((a, b) => a.memberName.localeCompare(b.memberName, 'id'))
}
