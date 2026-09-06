import { describe, expect, it } from 'vitest'

import { groupByMember, matchesSearch, normalise } from './filter'

describe('normalise', () => {
  it('ignores case, padding and accents', () => {
    expect(normalise('  Éndang ')).toBe('endang')
    expect(normalise('UJANG')).toBe(normalise('ujang'))
  })
})

describe('matchesSearch', () => {
  const row = ['Ujang', 'Sebelah Kali', 'Cabai', 'TM-999']

  it('matches nothing typed', () => {
    expect(matchesSearch(row, '')).toBe(true)
    expect(matchesSearch(row, '   ')).toBe(true)
  })

  it('finds a member by a fragment of their name', () => {
    expect(matchesSearch(row, 'uja')).toBe(true)
    expect(matchesSearch(row, 'Sri')).toBe(false)
  })

  // The reader is recalling two facts, not typing a sentence: "ujang cabai"
  // has to find the row even though no single field contains that phrase.
  it('requires every word, across any of the fields, in any order', () => {
    expect(matchesSearch(row, 'ujang cabai')).toBe(true)
    expect(matchesSearch(row, 'cabai ujang')).toBe(true)
    expect(matchesSearch(row, 'ujang padi')).toBe(false)
  })

  it('searches the plot and the variety too, not only the member', () => {
    expect(matchesSearch(row, 'kali')).toBe(true)
    expect(matchesSearch(row, 'tm-999')).toBe(true)
  })
})

describe('groupByMember', () => {
  const rows = [
    { member_id: 'm2', member_name: 'Ujang', area_ha: 0.5, plot: 'a' },
    { member_id: 'm1', member_name: 'Endang', area_ha: 0.4, plot: 'b' },
    { member_id: 'm2', member_name: 'Ujang', area_ha: 0.75, plot: 'c' },
  ]

  it('puts every plot a member holds in one block', () => {
    const groups = groupByMember(rows)
    const ujang = groups.find(g => g.memberId === 'm2')

    expect(ujang?.rows).toHaveLength(2)
    expect(ujang?.areaHa).toBeCloseTo(1.25)
  })

  // Sorted by name, not by tonnage or area: a plan ordered by size reads as a
  // ranking of members, and the reader is looking somebody up.
  it('files members alphabetically', () => {
    expect(groupByMember(rows).map(g => g.memberName)).toEqual(['Endang', 'Ujang'])
  })

  it('keeps each member\'s rows in the order they arrived', () => {
    const ujang = groupByMember(rows).find(g => g.memberId === 'm2')
    expect(ujang?.rows.map(r => r.plot)).toEqual(['a', 'c'])
  })

  it('has nothing to group when there is nothing', () => {
    expect(groupByMember([])).toEqual([])
  })
})
