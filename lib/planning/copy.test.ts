import { describe, expect, it } from 'vitest'

import {
  BASIS_NOTE, calibrationNote, engineNote, OBJECTIVE_COPY, OBJECTIVES, plausibilityCopy,
} from './copy'

describe('OBJECTIVES', () => {
  // The API returns the three plans in this order and the screen shows them
  // side by side. A reordering here would silently mislabel every card.
  it('keeps the order the API returns', () => {
    expect(OBJECTIVES).toEqual(['aman', 'pendapatan', 'pasar'])
  })

  it('gives each objective the question it answers, not a ranking', () => {
    for (const objective of OBJECTIVES) {
      expect(OBJECTIVE_COPY[objective].question).toMatch(/\?$/)
    }
  })

  // The cards are named A, B and C so that a pengurus and a kader looking at
  // two different screens can argue about the same plan.
  it('letters the plans in the order the API returns them', () => {
    expect(OBJECTIVES.map(o => OBJECTIVE_COPY[o].letter)).toEqual(['A', 'B', 'C'])
  })
})

describe('the trade-off', () => {
  // Three plans that each stated only their strengths would be three adverts.
  // Every plan costs something, and the card that hides the cost leaves the
  // pengurus to reverse-engineer it from six numbers.
  it('states what every plan gives up, not only what it gains', () => {
    for (const objective of OBJECTIVES) {
      const copy = OBJECTIVE_COPY[objective]
      expect(copy.optimises.length).toBeGreaterThan(0)
      expect(copy.sacrifices.length).toBeGreaterThan(0)
      expect(copy.sacrifices).not.toBe(copy.optimises)
    }
  })

  // Distinct sacrifices are what makes the three cards a choice rather than a
  // ranking: if two plans gave up the same thing, one of them is redundant.
  it('gives each plan a cost of its own', () => {
    const costs = OBJECTIVES.map(o => OBJECTIVE_COPY[o].sacrifices)
    expect(new Set(costs).size).toBe(OBJECTIVES.length)
  })
})

describe('the percentile ban', () => {
  // peak_tonnes_expected and peak_tonnes_worst are a mid case and a worst
  // case. The distribution behind them never reaches this app, so "P50",
  // "P90" and any percentage of likelihood would be a claim nothing supports.
  const forbidden = /\bP50\b|\bP90\b|persentil|\d+\s?% kemungkinan/i

  it('never appears in the words the planner puts on screen', () => {
    const strings = [
      BASIS_NOTE,
      engineNote('ai-service'),
      engineNote('fallback'),
      calibrationNote(0),
      calibrationNote(12),
      ...OBJECTIVES.flatMap(o => Object.values(OBJECTIVE_COPY[o])),
    ]
    for (const text of strings) expect(text).not.toMatch(forbidden)
  })
})

describe('BASIS_NOTE', () => {
  // Principle P2: next season's weather has not happened, and saying so is not
  // a footnote. It is the line that stops a plan being read as a promise.
  it('states the climate basis and that estimates are ranges', () => {
    expect(BASIS_NOTE).toContain('normal iklim')
    expect(BASIS_NOTE).toContain('rentang')
  })
})

describe('engineNote', () => {
  // "fallback" is not a failure: the plan is complete and Go computed every
  // figure in it. It gets a neutral sentence, not an apology.
  it('describes the fallback solver as neutrally as the AI one', () => {
    expect(engineNote('fallback')).not.toMatch(/gagal|error|tidak|darurat/i)
    expect(engineNote('ai-service')).not.toBe(engineNote('fallback'))
  })
})

describe('calibrationNote', () => {
  it('admits when no recorded harvest stands behind the figures', () => {
    expect(calibrationNote(0)).toContain('Belum ada panen tercatat')
  })

  it('counts the harvests when there are some', () => {
    expect(calibrationNote(12)).toContain('12 panen tercatat')
  })
})

describe('plausibilityCopy', () => {
  it('warns hardest on a window the model does not stand behind', () => {
    expect(plausibilityCopy('implausible').tone).toBe('negative')
    expect(plausibilityCopy('ok').tone).toBe('positive')
  })

  // `plausibility` is typed as a bare string on a saved plan's items, so an
  // unknown value has to render as itself rather than as "undefined".
  it('survives a value it has never seen', () => {
    expect(plausibilityCopy('mystery').label).toBe('mystery')
  })
})
