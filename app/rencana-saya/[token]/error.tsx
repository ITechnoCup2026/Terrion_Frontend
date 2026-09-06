'use client'

import { ErrorState } from '@/components/ui/ErrorState'

/**
 * A reader here has no account, no history behind the page and no idea what
 * Terrion is, so the failure has to name the one thing they can do about it.
 * A missing plan is a 404, not this — this is the server being unreachable.
 */
export default function Error({
  error, reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorState
      retry={reset}
      digest={error.digest}
      description={
        'Rencana tanam Anda tidak bisa dimuat sekarang. Coba buka lagi tautannya sebentar lagi, '
        + 'atau hubungi kader koperasi Anda.'
      }
    />
  )
}
