'use server'

import { apiFetch, ApiError, isBackendDown } from '@/lib/api/client'
import type { SignupResponseRaw } from '@/lib/api/types'
import { signupErrorMessage } from '@/lib/auth/signup-errors'
import { signupSchema } from '@/lib/schemas/signup'
import { signIn } from './login'

export type SignupResult =
  | { outcome: 'signed_in' }
  | { outcome: 'confirm_email'; email: string }
  | { outcome: 'error'; message: string }

/**
 * Registers a buyer against the real backend (POST /api/auth/signup, which
 * always creates a `buyer` -- role and cooperative are not in the request
 * body at all, see the schema comment). Its `signed_in` outcome means the
 * project doesn't require email confirmation, but the response carries no
 * session cookie, so this immediately follows up with POST /api/auth/login to
 * actually establish one.
 *
 * An address that already has an account also answers `confirm_email`, and
 * nothing here may treat that differently: the signup form must not become a
 * way to find out who is registered.
 */
export async function signUpBuyer(raw: unknown): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    return { outcome: 'error', message: parsed.error.issues[0]?.message ?? 'Isian tidak valid.' }
  }
  const { fullName, organisation, email, phone, password, confirmPassword } = parsed.data

  try {
    const result = await apiFetch<SignupResponseRaw>('/api/auth/signup', {
      method: 'POST',
      body: {
        full_name: fullName,
        organisation,
        email,
        phone,
        password,
        confirm_password: confirmPassword,
      },
    })

    if (result.outcome === 'signed_in') {
      // `as: 'buyer'` because this form only ever creates buyers -- koperasi
      // accounts are made by the pengelola after verification. If the backend
      // ever answered with another role for an account it just registered
      // here, the sign-in refusing is the right outcome, not a silent one.
      const signedIn = await signIn({ email, password, as: 'buyer' })
      if (!signedIn.ok) return { outcome: 'error', message: signedIn.message }
      return { outcome: 'signed_in' }
    }

    return { outcome: 'confirm_email', email: result.email }
  } catch (error) {
    // Nothing was created, so this one is worth saying plainly rather than
    // through the "hubungi pengelola Terrion" fallback: there is nobody to
    // telephone about a server that is merely down.
    if (isBackendDown(error)) {
      return { outcome: 'error', message: 'Server sedang tidak bisa dihubungi. Coba lagi beberapa saat lagi.' }
    }
    if (error instanceof ApiError) {
      return { outcome: 'error', message: signupErrorMessage({ code: error.code }) }
    }
    return { outcome: 'error', message: 'Gagal mendaftar. Coba lagi sebentar lagi.' }
  }
}
