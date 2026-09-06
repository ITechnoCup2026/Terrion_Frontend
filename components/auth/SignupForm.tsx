'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Building2, Lock, Mail, MailCheck, Phone, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { signUpBuyer } from '@/app/actions/signup'
import { AuthField, AuthPasswordField, PasswordStrength } from '@/components/auth/fields'
import { AuthError } from '@/components/auth/frame'
import { homeFor } from '@/lib/auth/display'
import { signupSchema, type SignupInput } from '@/lib/schemas/signup'

/**
 * The buyer registration form.
 *
 * Deliberately has no role picker and no cooperative picker. This form makes
 * one kind of account, and the Server Action hard-codes which -- a select box
 * here would imply the choice was the browser's to make.
 */
export function SignupForm() {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '', organisation: '', email: '', password: '', confirmPassword: '',
    },
  })
  const password = watch('password')

  const onSubmit = handleSubmit(async values => {
    setSubmitError(null)
    try {
      const result = await signUpBuyer(values)
      if (result.outcome === 'signed_in') {
        router.push(homeFor('buyer'))
        router.refresh()
        return
      }
      // A failure the server could explain arrives as a value, because a
      // Server Action that throws reaches production as React error #441 --
      // which is what this form used to display to buyers.
      if (result.outcome === 'error') {
        setSubmitError(result.message)
        return
      }
      setSentTo(result.email)
    } catch {
      // Only the genuinely unexpected gets here now: a network drop, or a
      // throw the action did not anticipate. Its message would be redacted
      // anyway, so it is not worth showing.
      setSubmitError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    }
  })

  // The same panel is shown for a new address and for one already registered,
  // so this form cannot be used to find out who has an account.
  if (sentTo) {
    return (
      <div className="panel rise mt-7 flex gap-4 p-6 sm:p-7">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--terrion-green-50)] text-[var(--terrion-green-700)]"
        >
          <MailCheck className="size-5" />
        </span>
        <div>
          <p className="text-[0.9375rem] font-bold text-[var(--terrion-green-700)]">
            Periksa email Anda
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Kami mengirim tautan konfirmasi ke{' '}
            <span className="font-medium text-foreground">{sentTo}</span>. Buka
            tautan itu untuk mengaktifkan akun, lalu masuk.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="panel rise mt-7 flex flex-col gap-4 p-6 sm:p-7"
      style={{ ['--rise-delay' as string]: '80ms' }}
    >
      <AuthField
        icon={User}
        label="Nama lengkap"
        {...register('fullName')}
        autoComplete="name"
        placeholder="Ibu Diana Prasetyo"
        error={errors.fullName?.message}
      />

      <AuthField
        icon={Building2}
        label="Nama organisasi"
        {...register('organisation')}
        autoComplete="organization"
        placeholder="PT Pangan Nusantara"
        error={errors.organisation?.message}
        hint={errors.organisation ? undefined : 'Ditampilkan kepada koperasi saat Anda mengajukan permintaan.'}
      />

      <AuthField
        icon={Phone}
        label="Nomor WhatsApp"
        {...register('phone')}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="0812-3456-7890"
        error={errors.phone?.message}
        hint={errors.phone ? undefined : 'Dipakai koperasi untuk membalas permintaan Anda lewat WhatsApp.'}
      />

      <AuthField
        icon={Mail}
        label="Email"
        {...register('email')}
        type="email"
        autoComplete="email"
        placeholder="nama@perusahaan.co.id"
        error={errors.email?.message}
      />

      <div className="flex flex-col gap-2">
        <AuthPasswordField
          icon={Lock}
          label="Kata sandi"
          {...register('password')}
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          error={errors.password?.message}
        />
        <PasswordStrength value={password ?? ''} />
      </div>

      <AuthPasswordField
        icon={Lock}
        label="Konfirmasi kata sandi"
        {...register('confirmPassword')}
        autoComplete="new-password"
        placeholder="Ulangi kata sandi"
        error={errors.confirmPassword?.message}
      />

      {submitError && <AuthError>{submitError}</AuthError>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="pill pill-solid interactive lift group mt-2 w-full justify-center text-sm font-semibold disabled:pointer-events-none disabled:opacity-60"
      >
        {isSubmitting ? 'Memproses…' : 'Daftar sebagai pembeli'}
        {!isSubmitting && (
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1"
          />
        )}
      </button>
    </form>
  )
}
