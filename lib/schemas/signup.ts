import { z } from 'zod'

import { whatsappNumber } from '@/lib/planning/share'

/**
 * What a buyer may say about themselves when registering.
 *
 * Shared by SignupForm and the signup Server Action so both agree on what a
 * valid registration is. Form fields arrive as strings, hence the trimming.
 *
 * Note what is absent: `role` and `cooperativeId`. A self-service form must not
 * be able to choose what kind of account it creates, and Zod strips unknown
 * keys by default, so a crafted POST carrying role: 'pengurus' loses it here
 * rather than being caught by a check somebody has to remember to write. The
 * action hard-codes 'buyer'.
 *
 * `organisation` is required, though the column is nullable and `pnpm register`
 * treats it as optional. It is the one thing the cooperative sees when deciding
 * whether to accept a request, so a self-registered buyer has to supply it.
 *
 * `phone` is required for the same reason, and it is not an auth factor: there
 * is no OTP and no verification. Terrion carries no messaging of its own, so a
 * WhatsApp number is the only way a cooperative can answer the contract a buyer
 * just asked for. Validated by `whatsappNumber`, which is the same function
 * that later builds the link — a number that passes here is a number the button
 * can actually open.
 */
export const signupSchema = z.object({
  fullName:     z.string().trim().min(2, 'Nama lengkap minimal 2 karakter'),
  organisation: z.string().trim().min(2, 'Nama organisasi minimal 2 karakter'),
  email:        z.email('Email tidak valid').trim().toLowerCase(),
  phone:        z.string().trim().refine(
    value => whatsappNumber(value) !== null,
    'Nomor WhatsApp tidak valid. Contoh: 0812-3456-7890',
  ),
  password:     z.string().min(8, 'Kata sandi minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine(v => v.password === v.confirmPassword, {
  message: 'Konfirmasi kata sandi tidak cocok',
  path: ['confirmPassword'],
})

export type SignupInput = z.infer<typeof signupSchema>
