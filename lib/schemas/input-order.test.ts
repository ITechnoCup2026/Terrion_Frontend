import { describe, expect, it } from 'vitest'

import { createInputOrderSchema, updateOrderStatusSchema } from './input-order'

const ORDER_ID = '11111111-2222-4333-8444-555555555555'

describe('updateOrderStatusSchema', () => {
  it('accepts the three steps an order can take', () => {
    for (const status of ['submitted', 'completed', 'cancelled'] as const) {
      expect(updateOrderStatusSchema.safeParse({ orderId: ORDER_ID, status }).success).toBe(true)
    }
  })

  // Handing paper to a kiosk is not undone by clicking in an app. The schema
  // gives that step nowhere to be expressed, the same way
  // respondToRequestSchema has no `pending`.
  it('has nowhere to say an order went back to draft', () => {
    expect(updateOrderStatusSchema.safeParse({ orderId: ORDER_ID, status: 'draft' }).success)
      .toBe(false)
  })

  it('rejects a status it has never heard of', () => {
    expect(updateOrderStatusSchema.safeParse({ orderId: ORDER_ID, status: 'dikirim' }).success)
      .toBe(false)
  })

  it('rejects an id that is not one', () => {
    expect(updateOrderStatusSchema.safeParse({ orderId: 'order-1', status: 'submitted' }).success)
      .toBe(false)
  })
})

describe('createInputOrderSchema', () => {
  // Nothing adjusted: order the RDKK as it stands.
  it('accepts an empty request', () => {
    expect(createInputOrderSchema.safeParse({}).success).toBe(true)
  })

  it('accepts adjusted whole sacks', () => {
    const parsed = createInputOrderSchema.safeParse({ lines: [{ item: 'urea', quantity: 6 }] })
    expect(parsed.success).toBe(true)
  })

  // Zero is a real answer -- "we are not ordering this one" -- and the server
  // drops the line rather than ordering nothing of it.
  it('accepts zero', () => {
    expect(createInputOrderSchema.safeParse({ lines: [{ item: 'urea', quantity: 0 }] }).success)
      .toBe(true)
  })

  it('rejects a negative amount', () => {
    const parsed = createInputOrderSchema.safeParse({ lines: [{ item: 'urea', quantity: -1 }] })
    expect(parsed.success).toBe(false)
  })

  // Fertiliser is not sold by the part sack, so a fractional line is one no
  // distributor can fill.
  it('rejects a part sack', () => {
    expect(createInputOrderSchema.safeParse({ lines: [{ item: 'urea', quantity: 2.5 }] }).success)
      .toBe(false)
  })

  it('rejects a line naming no item', () => {
    expect(createInputOrderSchema.safeParse({ lines: [{ item: '', quantity: 3 }] }).success)
      .toBe(false)
  })

  // The form's number input hands back strings.
  it('coerces a quantity typed into an input', () => {
    const parsed = createInputOrderSchema.safeParse({ lines: [{ item: 'urea', quantity: '6' }] })
    expect(parsed.success && parsed.data.lines?.[0].quantity).toBe(6)
  })
})
