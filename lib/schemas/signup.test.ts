import { describe, expect, it } from 'vitest'

import { signupSchema } from './signup'

const valid = {
  fullName: 'Ibu Diana Prasetyo',
  organisation: 'PT Pangan Nusantara',
  email: 'diana@pangannusantara.test',
  phone: '0812-3456-7890',
  password: 'rahasia123',
  confirmPassword: 'rahasia123',
}

describe('signupSchema', () => {
  it('accepts a complete buyer registration', () => {
    expect(signupSchema.parse(valid)).toMatchObject({
      fullName: 'Ibu Diana Prasetyo',
      organisation: 'PT Pangan Nusantara',
      email: 'diana@pangannusantara.test',
    })
  })

  it('lower-cases the email, so one address cannot become two accounts', () => {
    const parsed = signupSchema.parse({ ...valid, email: 'Diana@PanganNusantara.test' })
    expect(parsed.email).toBe('diana@pangannusantara.test')
  })

  it('requires an organisation: it is what the cooperative sees when judging', () => {
    const result = signupSchema.safeParse({ ...valid, organisation: '' })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error)).toContain('Nama organisasi minimal 2 karakter')
  })

  it('rejects a name too short to identify anybody', () => {
    expect(signupSchema.safeParse({ ...valid, fullName: 'D' }).success).toBe(false)
  })

  it('rejects a malformed email', () => {
    expect(signupSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects a password under 8 characters, matching pnpm register', () => {
    const short = { ...valid, password: 'short', confirmPassword: 'short' }
    const result = signupSchema.safeParse(short)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error)).toContain('Kata sandi minimal 8 karakter')
  })

  it('rejects a mismatched confirmation, and blames the confirmation field', () => {
    const result = signupSchema.safeParse({ ...valid, confirmPassword: 'rahasia124' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword'])
  })

  it('has no role field: a self-service form cannot choose what it becomes', () => {
    const parsed = signupSchema.parse({ ...valid, role: 'pengurus', cooperativeId: 'x' })
    expect(parsed).not.toHaveProperty('role')
    expect(parsed).not.toHaveProperty('cooperativeId')
  })

  // The number is not an auth factor -- there is no OTP -- but it is the only
  // way a cooperative can answer a contract request, so an unusable one is
  // refused at the form rather than discovered when somebody taps the button.
  it('refuses a number WhatsApp could not open', () => {
    const result = signupSchema.safeParse({ ...valid, phone: '12' })
    expect(result.success).toBe(false)
  })

  it('accepts the way Indonesians actually write a number', () => {
    for (const phone of ['0812-3456-7890', '0812 3456 7890', '+62 812 3456 7890']) {
      expect(signupSchema.safeParse({ ...valid, phone }).success).toBe(true)
    }
  })
})
