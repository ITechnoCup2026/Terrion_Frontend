import { describe, expect, it } from 'vitest'

import { parseObjective, readGoal } from './goal'

describe('readGoal', () => {
  it('says nothing when nothing was typed', () => {
    expect(readGoal('')).toEqual({ objective: null, matched: [], ambiguous: false })
    expect(readGoal('   ').objective).toBeNull()
  })

  it('reads a fear of a price collapse as the safe plan', () => {
    expect(readGoal('Musim depan saya tidak mau harga jatuh seperti Maret kemarin').objective)
      .toBe('aman')
    expect(readGoal('panennya jangan menumpuk, gudang tidak muat').objective).toBe('aman')
  })

  it('reads a want of income as the income plan', () => {
    expect(readGoal('saya ingin pendapatan anggota naik').objective).toBe('pendapatan')
    expect(readGoal('cari yang paling bernilai saja').objective).toBe('pendapatan')
  })

  it('reads a named buyer as the market plan', () => {
    expect(readGoal('cabai untuk pabrik yang tahun lalu kami tolak').objective).toBe('pasar')
    expect(readGoal('ada pembeli yang sudah minta kontrak').objective).toBe('pasar')
  })

  it('ignores case and padding', () => {
    expect(readGoal('  HARGA JATUH  ').objective).toBe('aman')
  })

  // §9.1 of the AI document names the likeliest way this feature misleads
  // anyone: a goal translated wrongly but plausibly. A tie is exactly that
  // risk, so it refuses rather than picking the first.
  it('refuses to choose when two readings are equally supported', () => {
    const reading = readGoal('harga jatuh tapi pendapatan harus naik')
    expect(reading.objective).toBeNull()
    expect(reading.ambiguous).toBe(true)
  })

  it('reports the words it read, so the reader can check the reasoning', () => {
    expect(readGoal('takut harga jatuh').matched).toContain('harga jatuh')
  })

  it('returns nothing for a sentence about something else entirely', () => {
    const reading = readGoal('tolong buatkan laporan bulanan')
    expect(reading.objective).toBeNull()
    expect(reading.ambiguous).toBe(false)
  })

  // Principle P4: the same input reads the same way every run. A tie broken by
  // iteration order would make the screen change its mind between reloads.
  it('reads the same sentence identically every time', () => {
    const sentence = 'saya tidak mau panen bertabrakan lagi seperti kemarin'
    const readings = Array.from({ length: 20 }, () => readGoal(sentence))
    for (const reading of readings) expect(reading).toEqual(readings[0])
  })
})

describe('parseObjective', () => {
  it('accepts only the three the API knows', () => {
    expect(parseObjective('aman')).toBe('aman')
    expect(parseObjective('pendapatan')).toBe('pendapatan')
    expect(parseObjective('pasar')).toBe('pasar')
  })

  it('rejects anything else a URL might carry', () => {
    expect(parseObjective('murah')).toBeNull()
    expect(parseObjective(undefined)).toBeNull()
    expect(parseObjective('')).toBeNull()
  })
})
