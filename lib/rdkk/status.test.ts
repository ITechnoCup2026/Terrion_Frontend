import { describe, expect, it } from 'vitest'

import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_MEANING,
  fallbackNextStatuses,
  isOrderOpen,
  orderActions,
} from './status'
import type { InputOrderStatusRaw } from '@/lib/api/types'

const ALL: InputOrderStatusRaw[] = ['draft', 'submitted', 'completed', 'cancelled']

describe('orderActions', () => {
  it('offers handover and cancellation on a draft', () => {
    expect(orderActions(['submitted', 'cancelled']).map(a => a.to))
      .toEqual(['submitted', 'cancelled'])
  })

  it('offers receipt and cancellation once submitted', () => {
    expect(orderActions(['completed', 'cancelled']).map(a => a.to))
      .toEqual(['completed', 'cancelled'])
  })

  // Cancelling is the way out, not the next step: it must never be the first
  // button under the reader's cursor, whatever order the API listed.
  it('puts cancellation last however the server ordered the list', () => {
    expect(orderActions(['cancelled', 'submitted']).map(a => a.to))
      .toEqual(['submitted', 'cancelled'])
  })

  it('offers nothing on a finished order', () => {
    expect(orderActions([])).toEqual([])
  })

  // The server owns the rules. A screen that invented its own would eventually
  // render a button the API refuses.
  it('shows only what the server offered', () => {
    expect(orderActions(['completed']).map(a => a.to)).toEqual(['completed'])
  })

  // There is no step back to draft, so there is no button for one -- even if a
  // future server were to offer it by mistake.
  it('never renders a step back to draft', () => {
    expect(orderActions(['draft', 'submitted']).map(a => a.to)).toEqual(['submitted'])
  })

  it('marks only cancellation as destructive', () => {
    const actions = orderActions(['submitted', 'completed', 'cancelled'])
    expect(actions.filter(a => a.destructive).map(a => a.to)).toEqual(['cancelled'])
  })
})

describe('fallbackNextStatuses', () => {
  // Only for a backend that predates `next_statuses`. Without it the modal
  // renders zero buttons and says nothing, which reads as "never built".
  it('offers the same steps the server would', () => {
    expect(fallbackNextStatuses('draft')).toEqual(['submitted', 'cancelled'])
    expect(fallbackNextStatuses('submitted')).toEqual(['completed', 'cancelled'])
  })

  it('offers nothing on a finished order', () => {
    expect(fallbackNextStatuses('completed')).toEqual([])
    expect(fallbackNextStatuses('cancelled')).toEqual([])
  })

  // A fallback, never an override: [] from the server is a real answer.
  it('agrees with what orderActions renders', () => {
    expect(orderActions(fallbackNextStatuses('draft')).map(a => a.to))
      .toEqual(['submitted', 'cancelled'])
  })
})

describe('isOrderOpen', () => {
  // What "one live order per season" counts. A completed or cancelled order is
  // history and must not block next season's.
  it('counts a draft and a submitted order as live', () => {
    expect(isOrderOpen('draft')).toBe(true)
    expect(isOrderOpen('submitted')).toBe(true)
  })

  it('does not count a finished order', () => {
    expect(isOrderOpen('completed')).toBe(false)
    expect(isOrderOpen('cancelled')).toBe(false)
  })
})

describe('status copy', () => {
  it('writes every status', () => {
    for (const status of ALL) {
      expect(ORDER_STATUS_LABEL[status]).toBeTruthy()
      expect(ORDER_STATUS_MEANING[status]).toBeTruthy()
    }
  })

  // "Selesai" left it ambiguous whether the fertiliser had arrived or merely
  // been paid for, and Terrion never touches money.
  it('says the fertiliser arrived rather than that the order is done', () => {
    expect(ORDER_STATUS_LABEL.completed).toBe('Pupuk diterima')
  })
})
